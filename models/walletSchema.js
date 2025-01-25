const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, // Reference to the User
      ref: "User",
      required: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0, // Default balance is 0
    },
    transactions: [
      {
        transactionType: {
          type: String,
          enum: ["Credit", "Debit"], // Credit for adding money, Debit for spending
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now, // Timestamp for the transaction
        },
        status: {
          type: String,
          enum: ["Success", "Pending", "Failed"], // Status of the transaction
          default: "Success",
        },
        orderId: {
          type: String,
          
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", walletSchema);
