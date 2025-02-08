const Banner = require('../../models/bannerSchema');
const path = require("path");
const fs = require("fs"); 

const getBanner = async (req, res) => {
    try {
        const banners = await Banner.find();
        res.render('banners',{banners});
    } catch (error) {
        console.log("Error in getBanners", error);
        res.redirect('/admin/pageerror');
    }
}

const getAddBanner = async (req, res) => {
    try {
        const banners = await Banner.find({});
        res.render('addBanner',{banners});
        
    } catch (error) {
        console.log("Error in getAddBanner", error);
        res.redirect('/admin/pageerror');     
    }
}

const addBanner = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image uploaded" });
        }

        const { title, description } = req.body;
        const imagePath = req.file.filename; // Keep path in `product-images`

        const newBanner = new Banner({
            title,
            description,
            image: imagePath
        });

        await newBanner.save();

        res.json({ success: true, message: "Banner uploaded successfully!" });

    } catch (error) {
        console.log("Error in addBanner", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const toggleBanner = async (req, res) => {
    try {
        const bannerId = req.body.id;
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        if(banner.length === 1){
            return res.status(400).json({ success: false, message: "Cannot toggle the only banner" });
        }
        if (banner.isActive) {
            banner.isActive = false;
            const isActive = banner.isActive;
            await banner.save();
            res.json({ success: true,isActive, message: "Banner InActivated successfully!" });
    
        } else {
            banner.isActive = true;
            const isActive = banner.isActive;
            await banner.save();
            res.json({ success: true, isActive, message: "Banner Activated successfully!" });
    
        }
    } catch (error) {
        console.log("Error in toggleBanner", error);
        res.status(500).json({ success: false, message: "Server error" });
        
    }
}

const getEditBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            res.redirect('/admin/pageerror');
        }
        res.render('edit-banner',{banner});
    } catch (error) {
        console.log("Error in getEditBanner", error);
        res.redirect('/admin/pageerror');
    }
}
const editBanner = async (req, res) => {
    try {
        const { bannerId, title, description } = req.body;
        let image = req.file ? req.file.filename : null;

        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }

        if (image) {
            if (banner.image) {
                const oldImagePath = path.join(__dirname, "..", "public/uploads/product-images", banner.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        } else {
            image = banner.image;
        }

        banner.title = title;
        banner.description = description;
        banner.image = image;
        await banner.save();

        return res.json({ success: true, message: "Banner updated successfully" });    } catch (error) {
        console.log("Error in editBanner", error);
        res.redirect('/admin/pageerror');  
    }
}

const deleteBanner = async (req, res) => {
    try {
        const bannerId = req.params.id;
        const banner = await Banner.findById(bannerId);
        if (!banner) {
            return res.status(404).json({ success: false, message: "Banner not found" });
        }
        if(banner.length === 1){
            return res.status(400).json({ success: false, message: "Cannot delete the only banner" });
        }
        await banner.deleteOne();
        res.json({ success: true, message: "Banner deleted successfully!" });
    } catch (error) {
        console.log("Error in deleteBanner", error);
        res.status(500).json({ success: false, message: "Server error" });   
    }
}

module.exports = {
    getBanner,
    getAddBanner,
    addBanner,
    toggleBanner,
    deleteBanner,
    getEditBanner,
    editBanner,
}