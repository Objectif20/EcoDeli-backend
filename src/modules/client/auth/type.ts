export interface loginResponse {
    access_token : string;
    profile : [
        client : boolean,
        deliveryman : boolean,
        merchant : boolean,
        provider : boolean,
    ]
}