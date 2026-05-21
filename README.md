# TechWithAman Website

A full-stack web application built with Express.js and EJS, featuring user authentication, session management, and SQLite database integration.

## 🌟 Features

- **User Authentication**: Secure login/registration system with bcryptjs password hashing
- **Session Management**: Express session-based user session handling
- **Database**: SQLite integration for persistent data storage
- **Template Engine**: EJS for dynamic server-side rendering
- **Admin Tools**: Grant admin privileges to users via command-line scripts
- **Page Synchronization**: HTML to EJS template conversion utility

## 🛠️ Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime | 20.x |
| **Express** | Web framework | ^5.2.1 |
| **EJS** | Template engine | ^5.0.2 |
| **SQLite3** | Database | ^6.0.1 |
| **better-sqlite3** | Synchronous SQLite driver | ^12.10.0 |
| **bcryptjs** | Password hashing | ^3.0.2 |
| **express-session** | Session middleware | ^1.18.2 |
| **dotenv** | Environment configuration | ^17.4.2 |

### Language Composition
- **JavaScript**: 36.9%
- **HTML**: 25.7%
- **EJS**: 19.0%
- **CSS**: 15.8%
- **Python**: 2.4%
- **Batchfile**: 0.2%

## 📋 Prerequisites

- Node.js 20.x or higher
- npm (Node Package Manager)

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Amankushwaha2005/techwithaman-website.git
   cd techwithaman-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the application**
   ```bash
   npm start
   ```

The server will start and be available at `http://localhost:3000` (or your configured port).

## 📚 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **start** | `npm start` | Start the production server |
| **dev** | `npm run dev` | Run the development server |
| **grant-admin** | `npm run grant-admin` | Promote a user to admin status |
| **sync-pages** | `npm run sync-pages` | Synchronize HTML files to EJS templates |
| **test** | `npm test` | Run test suite (not yet configured) |

## 📁 Project Structure

```
techwithaman-website/
├── server.js              # Main application entry point
├── package.json           # Project dependencies and scripts
├── public/                # Static assets (CSS, images, client-side JS)
├── views/                 # EJS template files
├── routes/                # Express route handlers
├── controllers/           # Business logic
├── middleware/            # Custom middleware
├── scripts/               # Utility scripts
│   ├── grant-admin.js     # Admin privilege script
│   └── sync-html-to-ejs.js # HTML to EJS converter
├── database/              # SQLite database files
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🔐 Security Features

- **Password Hashing**: Uses bcryptjs for secure password storage
- **Session Management**: Express session middleware for secure user sessions
- **Environment Configuration**: Sensitive data managed through environment variables

## 🗄️ Database

The application uses SQLite for data persistence:
- **Adapter**: sqlite3 and better-sqlite3
- **Location**: `./database/` directory
- **Features**: Full ACID compliance, embedded database, no server required

## 🔧 Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your_secret_key_here

# Database Configuration
DB_PATH=./database/app.db

# Other configurations
```

## 🧑‍💻 Usage Examples

### Starting the Server
```bash
npm start
```

### Granting Admin Access
```bash
npm run grant-admin
```

### Syncing HTML Templates to EJS
```bash
npm run sync-pages
```

## 📝 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please visit the [Issues page](https://github.com/Amankushwaha2005/techwithaman-website/issues).

## 📦 Repository Information

- **Repository**: [Amankushwaha2005/techwithaman-website](https://github.com/Amankushwaha2005/techwithaman-website)
- **Language**: JavaScript
- **Node Version Required**: 20.x
- **Package Type**: CommonJS

---

**Happy Coding! 🚀**
