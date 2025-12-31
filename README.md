# 🛍️ Eagleswing - Fashion E-Commerce Platform

A fully functional B2C e-commerce application built using **EJS, Node.js, MongoDB, Express.js (Monolithic)** with **Server-Side Rendering (SSR)**.

This project implements the classic **MVC (Model-View-Controller)** architecture to organize code efficiently, featuring a robust Admin Dashboard, secure payments via Razorpay, and a custom wallet system.

---

## 🏗️ Architecture: MVC Pattern
This application follows the **Model-View-Controller** design pattern to separate concerns:

* **Model (Mongoose):** Defines the data structure (User, Product, Order) and interacts with the MongoDB database.
* **View (EJS):** Handles the presentation layer. Pages are rendered on the server (SSR) and sent to the client as HTML, ensuring fast initial load times and better SEO.
* **Controller (Node/Express):** Handles the business logic, processes incoming requests, talks to the Models, and renders the appropriate Views.

---

## 🚀 Key Features

### 👤 User Features
* **Authentication:** Secure Login/Signup with OTP verification and Session Management.
* **Product Browsing:** Advanced filtering, sorting, and search capabilities.
* **Shopping Experience:** Add to Cart, Wishlist management, and Coupon application.
* **Checkout & Payments:** Secure checkout flow with address management and **Razorpay** integration.
* **User Dashboard:** Order history, invoice download (PDF), and profile management.
* **Wallet System:** Built-in digital wallet for refunds and quick payments.

### 🛡️ Admin Dashboard
* **Sales Reports:** Visual charts for daily/monthly/yearly sales.
* **Inventory Management:** Add/Edit/Delete products, manage categories, and stock levels.
* **Order Management:** Update order status (Shipped, Delivered, Cancelled) and handle returns.
* **User Management:** Block/Unblock users.
* **Offer Management:** Create product offers and referral codes.

---

## 🛠️ Tech Stack

* **Frontend (View):** EJS (Embedded JavaScript), CSS3, Bootstrap 5 / Tailwind CSS.
* **Backend (Controller):** Node.js, Express.js.
* **Database (Model):** MongoDB, Mongoose.
* **Payment Gateway:** Razorpay.
* **Session Management:** express-session.
* **Image Handling:** Multer (for product uploads).

---

## 📸 Screenshots

| Page | Preview |
| :--- | :--- |
| **Home Page** | <img src="https://github.com/user-attachments/assets/bec746d3-c196-4d62-8891-ac8654cef7a7" alt="Home page" width="100%"> |
| **Profile Page** | <img src="https://github.com/user-attachments/assets/efd2e0dd-e0a8-4823-882d-0f6abeb7466a" alt="Profile page" width="100%"> |
| **Order Details** | <img src="https://github.com/user-attachments/assets/42b0cb6c-5d60-471e-8cf5-43584f54445d" alt="Orders Details page" width="100%"> |
| **Admin Dashboard** | <img src="https://github.com/user-attachments/assets/c4b38e92-676a-4ec5-95b4-040feb90f642" alt="Admin Dashboard" width="100%"> |

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/Moosabilal/eCommerce.git](https://github.com/Moosabilal/eCommerce.git)
cd eagleswing

```

### 2. Install Dependencies

```bash
npm install

```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=your_random_session_secret

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Google Auth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=your_google_callback_url

# Email Service (OTP)
NODEMAILER_EMAIL=your_email_for_otp
NODEMAILER_PASSWORD=your_email_app_password

```

### 4. Start the Application

```bash
npm run dev

```

---

## 📂 Project Structure (MVC)

```text
eagleswing/
├── config/             # Database & Passport config
├── controllers/        # Business Logic (User, Admin, Product controllers)
├── models/             # Mongoose Schemas (Data Layer)
├── routes/             # Express Routes
├── views/              # EJS Templates (UI Layer)
│   ├── user/           # User-facing pages
│   ├── admin/          # Admin dashboard pages
│   └── partials/       # Reusable headers/footers
├── public/             # Static files (CSS, Images, JS)
├── middleware/         # Auth & Validation middleware
└── app.js              # Server Entry Point

```

---

## 🤝 Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

---

### 📬 Contact

**Moosa K A** [LinkedIn](https://www.google.com/search?q=https://www.linkedin.com/in/moosa-k-a-898300257) | [Portfolio](https://my-portfolio-eight-delta-akilc77lz3.vercel.app/projects)

```

```
