import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from 'src/common/schemas/message.schema';
import { ProfileService } from '../profile/profile.service';
import { MinioService } from 'src/common/services/file/minio.service';
import { OneSignalService } from 'src/common/services/notification/oneSignal.service';
import { Readable } from 'stream';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  private connectedUsers = new Map<string, Set<Socket>>();

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private userService: ProfileService,
    private minioService: MinioService,
    private oneSignalService: OneSignalService,
  ) {}

  async handleConnection(client: Socket) {
    console.log('New client connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    console.log('Client disconnected:', client.id, 'UserId:', userId);
    
    if (userId && this.connectedUsers.has(userId)) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client);
        console.log(`Removed socket for user ${userId}. Remaining sockets: ${userSockets.size}`);
        
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          console.log(`User ${userId} completely disconnected`);
        }
      }
    }
  }

  @SubscribeMessage('clientConnected')
  async handleConnect(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    console.log(`User ${userId} connecting with socket ${client.id}`);
    
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set<Socket>());
    }
    
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.add(client);
      console.log(`User ${userId} now has ${userSockets.size} connected device(s)`);
    }
    
    client.data.userId = userId;
    
    await this.sendUserMessages(userId);
    await this.sendContacts(userId, client);
  }

  @SubscribeMessage("get_contacts")
  async handleGetContacts(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.sendContacts(userId, client);
  }

  @SubscribeMessage("refresh_contacts")
  async handleRefreshContacts(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    await this.sendContacts(userId, client);
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { receiverId: string; content: string; fileUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    console.log(`Message from ${senderId} to ${data.receiverId}:`, data.content);
    
    if (!data.content && !data.fileUrl) {
      return;
    }

    const newMessage = new this.messageModel({
      senderId,
      receiverId: data.receiverId,
      content: data.content,
      fileUrl: data.fileUrl,
    });

    await newMessage.save();

    if (newMessage.fileUrl) {
      try {
        const updatedFileUrl = await this.minioService.generateImageUrl('user-chat', newMessage.fileUrl);
        newMessage.fileUrl = updatedFileUrl;
      } catch (error) {
        console.error('Error generating fileUrl for message:', newMessage._id, error);
      }
    }

    const receiverSockets = this.connectedUsers.get(data.receiverId);
    if (receiverSockets && receiverSockets.size > 0) {
      console.log(`Sending message to ${receiverSockets.size} device(s) of receiver ${data.receiverId}`);
      receiverSockets.forEach(socket => {
        socket.emit('receiveMessage', newMessage);
      });
    } else {
      console.log(`Receiver ${data.receiverId} not connected, sending push notification`);
      try {
        const senderProfile = await this.userService.getMyProfile(senderId);
        const title = `${senderProfile.first_name} ${senderProfile.last_name}`;
        const content = data.content || 'Nouveau fichier';

        await this.oneSignalService.sendNotification(
          data.receiverId,
          title,
          "Nouveau message : " + content,
        );
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }

    const senderSockets = this.connectedUsers.get(senderId);
    if (senderSockets && senderSockets.size > 0) {
      console.log(`Sending message to ${senderSockets.size} device(s) of sender ${senderId}`);
      senderSockets.forEach(socket => {
        socket.emit('receiveMessage', newMessage);
      });
    }
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    console.log("Sending messages to user:", userId, "for conversation with:", data.receiverId);

    const messages = await this.messageModel
      .find({
        $or: [
          { senderId: userId, receiverId: data.receiverId },
          { senderId: data.receiverId, receiverId: userId },
        ],
      })
      .sort({ timestamp: 1 });

    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => {
        const plainMsg = msg.toObject();
        if (plainMsg.fileUrl) {
          try {
            const fileUrl = await this.minioService.generateImageUrl('user-chat', plainMsg.fileUrl);
            return { ...plainMsg, fileUrl };
          } catch (error) {
            console.error('Error generating fileUrl for message:', msg._id, error);
            return plainMsg;
          }
        }
        return plainMsg;
      })
    );

    client.emit('messagesHistory', messagesWithUrls);
  }

  @SubscribeMessage('getConversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const conversations = await this.messageModel
      .aggregate([
        { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
        { $group: { _id: { $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId'] } } },
      ]);
    const users = conversations.map(conv => conv._id);
    client.emit('conversationList', users);
  }

  @SubscribeMessage('uploadFile')
  async handleFileUpload(
    @MessageBody()
    data: {
      receiverId: string;
      fileName: string;
      fileType: string;
      base64Data: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
    console.log('File upload from:', senderId, 'to:', data.receiverId);

    try {
      const base64Content = data.base64Data.split(',')[1];
      const buffer = Buffer.from(base64Content, 'base64');
      const simulatedFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: data.fileName,
        encoding: '7bit',
        mimetype: data.fileType,
        size: buffer.length,
        buffer,
        stream: Readable.from(buffer),
        destination: '',
        filename: '',
        path: '',
      };

      const fileExt = path.extname(simulatedFile.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `/user/${senderId}/chat/${data.receiverId}/${fileName}`;
      
      const success = await this.minioService.uploadFileToBucket(
        'user-chat',
        filePath,
        simulatedFile
      );

      if (!success) {
        client.emit('uploadFailed', { message: 'Upload failed' });
        console.error('Upload failed');
        return;
      }

      const newMessage = new this.messageModel({
        senderId,
        receiverId: data.receiverId,
        content: 'File uploaded',
        fileUrl: filePath,
      });

      await newMessage.save();
      console.log('File message saved:', newMessage._id);

      if (newMessage.fileUrl) {
        try {
          const updatedFileUrl = await this.minioService.generateImageUrl('user-chat', newMessage.fileUrl);
          newMessage.fileUrl = updatedFileUrl;
        } catch (error) {
          console.error('Error generating fileUrl for message:', newMessage._id, error);
        }
      }

      const receiverSockets = this.connectedUsers.get(data.receiverId);
      if (receiverSockets && receiverSockets.size > 0) {
        console.log(`Sending file message to ${receiverSockets.size} device(s) of receiver ${data.receiverId}`);
        receiverSockets.forEach(socket => {
          socket.emit('receiveMessage', newMessage);
        });
      } else {
        try {
          const senderProfile = await this.userService.getMyProfile(senderId);
          const title = `${senderProfile.first_name} ${senderProfile.last_name}`;

          await this.oneSignalService.sendNotification(
            data.receiverId,
            title,
            `You have received a new file from ${title}`,
          );
        } catch (error) {
          console.error('Error sending push notification for file:', error);
        }
      }

      const senderSockets = this.connectedUsers.get(senderId);
      if (senderSockets && senderSockets.size > 0) {
        console.log(`Sending file message to ${senderSockets.size} device(s) of sender ${senderId}`);
        senderSockets.forEach(socket => {
          socket.emit('receiveMessage', newMessage);
        });
      }

      console.log('File upload completed successfully');
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      client.emit('uploadFailed', { message: 'Server error during upload' });
    }
  }

  private async sendUserMessages(userId: string) {
    const unreadMessages = await this.messageModel
      .find({ receiverId: userId, isRead: false })
      .sort({ timestamp: 1 });
    
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      console.log(`Sending ${unreadMessages.length} unread messages to ${userSockets.size} device(s) of user ${userId}`);
      userSockets.forEach(socket => {
        socket.emit('receiveUnreadMessages', unreadMessages);
      });
    }
  }

  private async sendContacts(userId: string, client: Socket) {
    const conversations = await this.messageModel
      .aggregate([
        { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
        { $group: { _id: { $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId'] } } },
      ]);
    
    const userIds = conversations.map(conv => conv._id);
    const contacts = await Promise.all(userIds.map(id => this.userService.getMyProfile(id)));
    client.emit('contacts', contacts);
  }

  @SubscribeMessage('debugConnections')
  handleDebugConnections(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const userSockets = this.connectedUsers.get(userId);
    const socketCount = userSockets ? userSockets.size : 0;
    
    console.log(`Debug - User ${userId} has ${socketCount} connected device(s)`);
    client.emit('debugInfo', {
      userId,
      socketCount,
      currentSocketId: client.id
    });
  }
}