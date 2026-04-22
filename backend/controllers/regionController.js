const db = require("../config/db");

// Get all provinces
exports.getProvinces = async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, name FROM regions WHERE type = 'PROVINCE' ORDER BY name ASC"
        );
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching provinces:", err);
        res.status(500).json({ error: "Failed to fetch provinces" });
    }
};

// Get children by parent_id (Get regencies by province id, districts by regency id, etc)
exports.getChildren = async (req, res) => {
    const { parentId } = req.params;
    try {
        const result = await db.query(
            "SELECT id, name FROM regions WHERE parent_id = $1 ORDER BY name ASC",
            [parentId]
        );
        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching regions by parent_id:", err);
        res.status(500).json({ error: "Failed to fetch child regions" });
    }
};
