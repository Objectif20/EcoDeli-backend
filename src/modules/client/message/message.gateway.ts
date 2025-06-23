import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from 'src/common/schemas/message.schema';
import { ProfileService } from '../profile/profile.service';
import { MinioService } from 'src/common/services/file/minio.service';
import { Readable } from 'stream';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { OneSignalService } from 'src/common/services/notification/oneSignal.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway {
  @WebSocketServer()
  server: Server;
  private connectedUsers = new Map<string, Socket>();
  private typingUsers = new Map<string, string>();

  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private userService: ProfileService,
    private minioService: MinioService,
    private oneSignalService: OneSignalService,
  ) {}

  @SubscribeMessage('clientConnected')
  async handleConnect(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    this.connectedUsers.set(userId, client);
    client.data.userId = userId;
    this.sendUserMessages(userId);
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

  @SubscribeMessage('disconnect')
  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.connectedUsers.forEach((socket, userId) => {
      if (socket.id === client.id) {
        this.connectedUsers.delete(userId);
        this.typingUsers.delete(userId);
      }
    });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { receiverId: string; content: string; fileUrl?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const senderId = client.data.userId;
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

    const receiverSocket = this.connectedUsers.get(data.receiverId);
    if (receiverSocket) {
      receiverSocket.emit('receiveMessage', newMessage);
    } else {
      const senderProfile = await this.userService.getMyProfile(senderId);
      const title = `${senderProfile.first_name} ${senderProfile.last_name}`;
      const content = data.content;

      await this.oneSignalService.sendNotification(
        data.receiverId,
        title,
        "Nouveau message :" + content,
      );
    }

    client.emit('receiveMessage', newMessage);
  }

  @SubscribeMessage('getMessages')
  async handleGetMessages(
    @MessageBody() data: { receiverId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    console.log("Sending messages to user:", userId);

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

    console.log('Sender ID:', senderId);
    console.log('Receiver ID:', data.receiverId);
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
      const fileUrl = filePath;
      const newMessage = new this.messageModel({
        senderId,
        receiverId: data.receiverId,
        content: 'File uploaded',
        fileUrl: fileUrl,
      });
      await newMessage.save();
      console.log('Message saved:', newMessage);
      if (newMessage.fileUrl) {
        try {
          const updatedFileUrl = await this.minioService.generateImageUrl('user-chat', newMessage.fileUrl);
          newMessage.fileUrl = updatedFileUrl;
        } catch (error) {
          console.error('Error generating fileUrl for message:', newMessage._id, error);
        }
      }
      const receiverSocket = this.connectedUsers.get(data.receiverId);
      if (receiverSocket) {
        receiverSocket.emit('receiveMessage', newMessage);
      } else {
        const senderProfile = await this.userService.getMyProfile(senderId);
        const title = `${senderProfile.first_name} ${senderProfile.last_name}`;

        await this.oneSignalService.sendNotification(
          data.receiverId,
          title,
          `You have received a new file from ${title}`,
        );
      }
      client.emit('receiveMessage', newMessage);
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      client.emit('uploadFailed', { message: 'Server error during upload' });
    }
  }

  private async sendUserMessages(userId: string) {
    const unreadMessages = await this.messageModel
      .find({ receiverId: userId, isRead: false })
      .sort({ timestamp: 1 });
    const clientSocket = this.connectedUsers.get(userId);
    if (clientSocket) {
      clientSocket.emit('receiveUnreadMessages', unreadMessages);
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
}
