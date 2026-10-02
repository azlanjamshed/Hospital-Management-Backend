const PDFDocument = require("pdfkit");

const generatePrescriptionPdf = (data, res) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.pipe(res);

  doc.fontSize(20).text(data.organization.name, {
    align: "center",
  });

  doc.fontSize(10).text(data.organization.address || "", {
    align: "center",
  });

  if (data.organization.phone) {
    doc.text(`Phone: ${data.organization.phone}`, {
      align: "center",
    });
  }

  doc.moveDown();

  doc.fontSize(16).text("PRESCRIPTION", {
    align: "center",
    underline: true,
  });

  doc.moveDown();

  doc.fontSize(11).text(`Patient: ${data.patient.name}`);

  if (data.patient.dateOfBirth) {
    doc.text(
      `Date of Birth: ${new Date(
        data.patient.dateOfBirth,
      ).toLocaleDateString()}`,
    );
  }

  if (data.patient.gender) {
    doc.text(`Gender: ${data.patient.gender}`);
  }

  doc.moveDown();

  doc.text(`Doctor: Dr. ${data.doctor.name}`);

  if (data.doctor.qualification) {
    doc.text(`Qualification: ${data.doctor.qualification}`);
  }

  if (data.doctor.registrationNumber) {
    doc.text(`Registration No: ${data.doctor.registrationNumber}`);
  }

  doc.moveDown();

  doc.text(
    `Prescription Date: ${new Date(
      data.prescription.issuedAt,
    ).toLocaleDateString()}`,
  );

  doc.moveDown();

  doc.fontSize(13).text("Medicines", {
    underline: true,
  });

  doc.moveDown(0.5);

  data.medicines.forEach((medicine, index) => {
    doc.fontSize(11).text(`${index + 1}. ${medicine.medicineName}`);

    if (medicine.dosage) {
      doc.text(`   Dosage: ${medicine.dosage}`);
    }

    if (medicine.frequency) {
      doc.text(`   Frequency: ${medicine.frequency}`);
    }

    if (medicine.duration) {
      doc.text(`   Duration: ${medicine.duration}`);
    }

    if (medicine.instructions) {
      doc.text(`   Instructions: ${medicine.instructions}`);
    }

    doc.moveDown(0.5);
  });

  if (data.consultation?.diagnosis || data.consultation?.doctorRemarks) {
    doc.moveDown();

    doc.fontSize(13).text("Clinical Information", {
      underline: true,
    });

    doc.moveDown(0.5);

    if (data.consultation.diagnosis) {
      doc.fontSize(11).text(`Diagnosis: ${data.consultation.diagnosis}`);
    }

    if (data.consultation.doctorRemarks) {
      doc.text(`Doctor's Remarks: ${data.consultation.doctorRemarks}`);
    }
  }

  doc.moveDown(2);

  doc.fontSize(10).text("This is a digitally generated prescription.", {
    align: "center",
  });

  doc.end();
};
const generatePatientPrescriptionPdf = async ({
  prescriptionId,
  patientId,
  res,
}) => {
  const prescriptionService = require("./prescription.service");

  const rawData = await prescriptionService.getPatientPrescription({
    prescriptionId,
    patientId,
  });

  // Transform raw prescription to the print-data format expected by generatePrescriptionPdf
  const data = {
    prescription: {
      id: rawData.id,
      issuedAt: rawData.issuedAt,
    },
    organization: rawData.organization,
    patient: rawData.patient,
    doctor: rawData.doctor,
    consultation: rawData.consultation,
    medicines: rawData.items.map((item) => ({
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions,
    })),
  };

  generatePrescriptionPdf(data, res);
};
module.exports = {
  generatePrescriptionPdf,
  generatePatientPrescriptionPdf,
};
