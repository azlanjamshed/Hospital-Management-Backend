const clinicService = require("./clinic.service");

const createClinic = async (req, res) => {
  try {
    const clinic = await clinicService.createClinic(req.body);

    res.status(201).json({
      success: true,
      message: "Clinic created successfully",
      data: clinic,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create clinic",
    });
  }
};

const getClinics = async (req, res) => {
  try {
    const clinics = await clinicService.getClinics();

    res.status(200).json({
      success: true,
      data: clinics,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch clinics",
    });
  }
};

const getClinicById = async (req, res) => {
  try {
    const clinic = await clinicService.getClinicById(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    res.status(200).json({
      success: true,
      data: clinic,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch clinic",
    });
  }
};

const updateClinic = async (req, res) => {
  try {
    const clinic = await clinicService.updateClinic(req.params.id, req.body);
    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Clinic updated successfully",
      data: clinic,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to update clinic",
    });
  }
};

const deleteClinic = async (req, res) => {
  try {
    const clinic = await clinicService.deleteClinic(req.params.id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Clinic deleted successfully",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to delete clinic",
    });
  }
};

module.exports = {
  createClinic,
  getClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
};
