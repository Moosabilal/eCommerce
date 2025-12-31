# 🛍️ Eagleswing - Fashion E-Commerce Platform

A fully functional B2C e-commerce application built using the **EJS, Node.js, MongoDB, Express.js (Monolithic)** with **Server-Side Rendering (SSR)**.

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
![Home page]<img width="1905" height="918" alt="image" src="https://github.com/user-attachments/assets/bec746d3-c196-4d62-8891-ac8654cef7a7" />
![Profile page]<img width="1905" height="918" alt="image" src="https://github.com/user-attachments/assets/efd2e0dd-e0a8-4823-882d-0f6abeb7466a" />
![Orders Details page]<img width="1905" height="918" alt="image" src="https://github.com/user-attachments/assets/42b0cb6c-5d60-471e-8cf5-43584f54445d" />



*(Add screenshots here of your Home Page, Product Details, and Admin Dashboard)*

---

## ⚙️ Installation & Setup

Follow these steps to run the project locally.

### 1. Clone the Repository
```bash
git clone [https://github.com/yourusername/eagleswing.git](https://github.com/yourusername/eagleswing.git
cd eagleswing
