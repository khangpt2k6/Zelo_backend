  #  Microservices Campus Social Chat App

A scalable, real-time chat application built with microservices architecture, featuring secure authentication, instant messaging, and email notifications.
**Visit the website: http://54.80.194.225:3000/**

**Visit the Frontend Repo here: https://github.com/khangpt2k6/Zelo**

## Architecture Overview

This application follows a **microservices architecture** with independent services communicating through **RabbitMQ** message queues, ensuring high scalability and maintainability.

<img width="1024" height="1024" alt="image" src="https://github.com/user-attachments/assets/25f9a0b6-2a29-4e0b-9ada-2d1e8f0a695a" />


## 🛠️ Tech Stack

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/Rabbitmq-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=for-the-badge&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-%23FF9900.svg?style=for-the-badge&logo=amazon-aws&logoColor=white)

</div>

## Microservices

### User Service (Port: 5000)
- User authentication & authorization
- Profile management with Cloudinary integration
- JWT token generation and validation
- Redis caching for session management

### Chat Service (Port: 5002)
- Real-time messaging with Socket.io
- Message persistence in MongoDB
- File/image sharing capabilities
- Chat room management

### Mail Service (Port: 5001)
- Email notifications via RabbitMQ
- OTP verification emails
- Welcome & system notifications
- Queue-based email processing

##  Quick Start


### 1. Clone Repository
```bash
git clone https://github.com/khangpt2k6/Zelo_backend
cd microservices-chat-app
```

### 2. Environment Configuration

#### User Service (.env)
```env
MONGO_URI=
PORT=5000
REDIS_URL=
RABBITMQ_HOST=54.166.255.142
RABBITMQ_USERNAME=
RABBITMQ_PASSWORD=
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=
JWT_SECRET=
```

#### Chat Service (.env)
```env
PORT=5002
MONGO_DB_URL=
JWT_SECRET=
USER_SERVICE=http://localhost:5000
CLOUD_NAME=
CLOUD_API_KEY=
CLOUD_API_SECRET=
```

#### Mail Service (.env)
```env
PORT=5001
RABBITMQ_HOST=54.166.255.142
RABBITMQ_USERNAME=
RABBITMQ_PASSWORD=
USER_MAIL=
PASSWORD=
```

### 3. Start Services

#### Option A: Individual Services
```bash
# Terminal 1 - User Service
cd user
npm install
npm run dev

# Terminal 2 - Chat Service  
cd chat
npm install
npm run dev

# Terminal 3 - Mail Service
cd mail
npm install
npm run dev

# Terminal 4 - Frontend
cd frontend
npm install
npm run dev
```

#### Option B: Docker Compose (Recommended)
```bash
docker-compose up --build
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **User API**: http://localhost:5000
- **Mail API**: http://localhost:5001
- **Chat API**: http://localhost:5002
- **RabbitMQ Management**: http://54.166.255.142:15672

## 🌟 Key Features

### 1. Authentication System
### 2. Real-Time Chat

###  3. Responsive Design

### 4. Message Queue Integration

##  Infrastructure

### AWS EC2 Deployment
- **RabbitMQ**: Hosted on EC2 instance (54.166.255.142)
- **Docker**: Containerized microservices
- **Load Balancing**: Ready for horizontal scaling
- **Monitoring**: Application health checks

### Database Architecture
- **MongoDB**: Message and user data persistence
- **Redis**: Session caching and real-time data
- **Cloudinary**: Image and file storage


### API Endpoints
- **User Service**: Authentication, profile management
- **Chat Service**: Real-time messaging, file upload
- **Mail Service**: Email notifications, OTP verification


### AWS EC2 Deployment
1. Launch EC2 instances
2. Install Docker & Docker Compose
3. Configure security groups (ports 3000, 5000-5002, 15672)
4. Deploy with environment variables
5. Set up load balancer for high availability
