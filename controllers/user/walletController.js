const Wallet = require('../../models/walletSchema');
const User = require('../../models/userSchema');

const getWallet = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findById(user);
        let wallet = await Wallet.findOne({ userId: user });
        if(!wallet){
            const transactions = []; 

            const newWallet = new Wallet({
                userId:user,
                balance: 0,
                transactions
            });

            // Save the new wallet to the database
            wallet = await newWallet.save();
        }

        if (wallet) {
            wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }

        res.render('wallet', {
            wallet: wallet,
            user: userData,
        });
    } catch (error) {
        console.error("Error in rendering wallet", error);
        res.redirect('/pageNotFound');
    }
};

const addAmount = async (req, res) => {
    try {
        const addAmount = parseFloat(req.body.addAmount);
        const user = req.session.user;

        const wallet = await Wallet.findOneAndUpdate(
            { userId: user },
            {
                $inc: { balance: addAmount },
                $push: {
                    transactions: {
                        transactionType: "Credit",
                        amount: addAmount,
                        status: "Success",
                        date: new Date(),
                        orderId: null,
                    },
                },
            },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
                runValidators: true,
            }
        );

        if (!wallet) {
            return res.status(400).json({ success: false, message: "Failed to credit amount to wallet" });
        }
        const sortedTransactions = wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const latestTransaction = sortedTransactions[0]; 

        res.status(200).json({
            success: true,
            message: "Amount added successfully",
            balance: wallet.balance,
            transaction: latestTransaction, // Send the most recent transaction
            transactions: sortedTransactions, // Optional: send sorted transactions if needed
        });
    } catch (error) {
        console.error("Error in adding amount", error);
        res.status(500).json({ success: false, message: "Error in adding amount" });
    }
};

    


module.exports = {
    getWallet,
    addAmount,
}