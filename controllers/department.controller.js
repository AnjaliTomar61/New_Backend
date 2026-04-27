import { Department } from "../models/department.model.js";

// ➕ Create Department
export const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    // basic validation
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and Code are required",
      });
    }

    // check duplicate
    const existing = await Department.findOne({
      $or: [{ name }, { code }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Department already exists",
      });
    }

    const department = await Department.create({
      name,
      code,
      description,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// 📄 Get All Departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleDepartmentStatus = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    department.isActive = !department.isActive;
    await department.save();

    res.status(200).json({
      success: true,
      message: "Department status updated",
      department,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// 🔍 Get Single Department
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ✏️ Update Department
export const updateDepartment = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, code, description, isActive },
      { new: true }
    );

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Department updated",
      department,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ❌ Delete Department
export const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Department deleted",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};