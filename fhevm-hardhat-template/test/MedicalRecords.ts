import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { MedicalRecords, MedicalRecords__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  foundation: HardhatEthersSigner;
  patient: HardhatEthersSigner;
  doctor: HardhatEthersSigner;
  unauthorizedUser: HardhatEthersSigner;
};

async function deployMedicalRecordsFixture() {
  const factory = (await ethers.getContractFactory("MedicalRecords")) as MedicalRecords__factory;
  const medicalRecordsContract = (await factory.deploy()) as MedicalRecords;
  const contractAddress = await medicalRecordsContract.getAddress();

  return { medicalRecordsContract, contractAddress };
}

describe("MedicalRecords Foundation System v2", function () {
  let signers: Signers;
  let medicalRecordsContract: MedicalRecords;
  let contractAddress: string;

  const testPatientName = "Juan Perez";
  const testPatientId = 12345;
  const testDisease1 = "Diabetes";
  const testDisease2 = "Hypertension";

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { 
      deployer: ethSigners[0],
      foundation: ethSigners[1],
      patient: ethSigners[2],
      doctor: ethSigners[3],
      unauthorizedUser: ethSigners[4] 
    };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite cannot run on Sepolia Testnet");
      this.skip();
    }

    ({ medicalRecordsContract, contractAddress } = await deployMedicalRecordsFixture());

    // Authorize foundation
    await medicalRecordsContract.connect(signers.deployer).authorizeFoundation(signers.foundation.address);
  });

  describe("Foundation Authorization", function () {
    it("should deploy with owner as authorized foundation", async function () {
      const isAuthorized = await medicalRecordsContract.isFoundationAuthorized(signers.deployer.address);
      expect(isAuthorized).to.be.true;
    });

    it("should allow owner to authorize new foundations", async function () {
      const newFoundation = signers.doctor.address;
      
      await expect(
        medicalRecordsContract.connect(signers.deployer).authorizeFoundation(newFoundation)
      ).to.emit(medicalRecordsContract, "FoundationAuthorized")
       .withArgs(newFoundation);

      const isAuthorized = await medicalRecordsContract.isFoundationAuthorized(newFoundation);
      expect(isAuthorized).to.be.true;
    });

    it("should allow owner to revoke foundation authorization", async function () {
      const foundation = signers.foundation.address;
      
      await expect(
        medicalRecordsContract.connect(signers.deployer).revokeFoundation(foundation)
      ).to.emit(medicalRecordsContract, "FoundationRevoked")
       .withArgs(foundation);

      const isAuthorized = await medicalRecordsContract.isFoundationAuthorized(foundation);
      expect(isAuthorized).to.be.false;
    });

    it("should not allow non-owner to authorize foundations", async function () {
      await expect(
        medicalRecordsContract.connect(signers.unauthorizedUser).authorizeFoundation(signers.doctor.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Patient Registration (v2 - Public Names)", function () {
    it("should register a new patient with public name successfully", async function () {
      const patient = signers.patient.address;

      // Create encrypted input only for ID (name is now public)
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await expect(
        medicalRecordsContract
          .connect(signers.foundation)
          .registerPatient(
            patient,
            testPatientName,           // Public name
            encrypted.handles[0],      // Encrypted ID
            encrypted.inputProof
          )
      ).to.emit(medicalRecordsContract, "PatientRegistered")
       .withArgs(patient, signers.foundation.address, testPatientName);

      expect(await medicalRecordsContract.isPatientRegistered(patient)).to.be.true;
      expect(await medicalRecordsContract.getTotalPatients()).to.equal(1);
    });

    it("should return public name without decryption", async function () {
      const patient = signers.patient.address;

      // Register patient
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );

      // Get patient name (should be public)
      const name = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientName(patient);

      expect(name).to.equal(testPatientName);
    });

    it("should decrypt patient ID correctly", async function () {
      const patient = signers.patient.address;

      // Register patient
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );

      // Get and decrypt patient ID
      const encryptedId = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientId(patient);
      
      const decryptedId = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedId,
        contractAddress,
        signers.foundation
      );

      expect(decryptedId).to.equal(testPatientId);
    });

    it("should not allow unauthorized users to register patients", async function () {
      const patient = signers.patient.address;

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.unauthorizedUser.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await expect(
        medicalRecordsContract
          .connect(signers.unauthorizedUser)
          .registerPatient(
            patient,
            testPatientName,
            encrypted.handles[0],
            encrypted.inputProof
          )
      ).to.be.revertedWith("Not an authorized foundation");
    });
  });

  describe("Disease Management", function () {
    beforeEach(async function () {
      // Register patient first
      const patient = signers.patient.address;

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );
    });

    it("should add disease to patient record", async function () {
      const patient = signers.patient.address;
      const diseaseBytes = Buffer.from(testDisease1, 'utf8');

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      for (let i = 0; i < diseaseBytes.length; i++) {
        encryptedInput.add8(diseaseBytes[i]);
      }
      
      const encrypted = await encryptedInput.encrypt();

      await expect(
        medicalRecordsContract
          .connect(signers.foundation)
          .addDisease(
            patient,
            encrypted.handles,
            diseaseBytes.length,
            encrypted.inputProof
          )
      ).to.emit(medicalRecordsContract, "DiseaseAdded")
       .withArgs(patient, signers.foundation.address, 0);

      const diseaseCount = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientDiseaseCount(patient);
      
      expect(diseaseCount).to.equal(1);
    });

    it("should decrypt patient diseases correctly", async function () {
      const patient = signers.patient.address;
      const diseaseBytes = Buffer.from(testDisease1, 'utf8');

      // Add disease
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      for (let i = 0; i < diseaseBytes.length; i++) {
        encryptedInput.add8(diseaseBytes[i]);
      }
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .addDisease(patient, encrypted.handles, diseaseBytes.length, encrypted.inputProof);

      // Get and decrypt disease
      const [encryptedDiseaseData, diseaseLength] = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientDisease(patient, 0);

      expect(diseaseLength).to.equal(diseaseBytes.length);

      // Decrypt disease bytes
      const decryptedBytes = new Array(Number(diseaseLength));
      for (let i = 0; i < Number(diseaseLength); i++) {
        const decryptedByte = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedDiseaseData[i],
          contractAddress,
          signers.foundation
        );
        decryptedBytes[i] = Number(decryptedByte);
      }

      const decryptedDisease = Buffer.from(decryptedBytes).toString('utf8');
      expect(decryptedDisease).to.equal(testDisease1);
    });
  });

  describe("Access Control", function () {
    beforeEach(async function () {
      // Register patient
      const patient = signers.patient.address;

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );
    });

    it("should grant access to authorized entity successfully", async function () {
      const patient = signers.patient.address;
      const doctor = signers.doctor.address;

      await expect(
        medicalRecordsContract
          .connect(signers.patient)
          .grantAccess(doctor)
      ).to.emit(medicalRecordsContract, "AccessGranted")
       .withArgs(patient, doctor);

      expect(
        await medicalRecordsContract.authorizedAccess(patient, doctor)
      ).to.be.true;
    });

    it("should revoke access successfully", async function () {
      const patient = signers.patient.address;
      const doctor = signers.doctor.address;

      // Grant access first
      await medicalRecordsContract
        .connect(signers.patient)
        .grantAccess(doctor);

      // Then revoke it
      await expect(
        medicalRecordsContract
          .connect(signers.patient)
          .revokeAccess(doctor)
      ).to.emit(medicalRecordsContract, "AccessRevoked")
       .withArgs(patient, doctor);

      expect(
        await medicalRecordsContract.authorizedAccess(patient, doctor)
      ).to.be.false;
    });

    it("should not allow unauthorized access to patient data", async function () {
      const patient = signers.patient.address;

      await expect(
        medicalRecordsContract
          .connect(signers.unauthorizedUser)
          .getPatientName(patient)
      ).to.be.revertedWith("Not authorized to access this patient's data");
    });
  });

  describe("Statistics Functions", function () {
    beforeEach(async function () {
      // Register multiple patients for statistics testing
      const patients = [
        { address: signers.patient.address, name: "Patient One", id: 11111 },
        { address: signers.doctor.address, name: "Patient Two", id: 22222 },
        { address: signers.unauthorizedUser.address, name: "Patient Three", id: 33333 }
      ];

      for (const patient of patients) {
        const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
        encryptedInput.add32(patient.id);
        const encrypted = await encryptedInput.encrypt();

        await medicalRecordsContract
          .connect(signers.foundation)
          .registerPatient(
            patient.address,
            patient.name,
            encrypted.handles[0],
            encrypted.inputProof
          );

        // Add diseases to first two patients
        if (patient.address === signers.patient.address || patient.address === signers.doctor.address) {
          const diseaseBytes = Buffer.from(testDisease1, 'utf8');
          const diseaseInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
          
          for (let i = 0; i < diseaseBytes.length; i++) {
            diseaseInput.add8(diseaseBytes[i]);
          }
          
          const diseaseEncrypted = await diseaseInput.encrypt();

          await medicalRecordsContract
            .connect(signers.foundation)
            .addDisease(
              patient.address,
              diseaseEncrypted.handles,
              diseaseBytes.length,
              diseaseEncrypted.inputProof
            );
        }
      }
    });

    it("should return correct system statistics", async function () {
      const [totalPatients, totalDiseases, avgDiseases] = await medicalRecordsContract.getSystemStatistics();
      
      expect(totalPatients).to.equal(3);
      expect(totalDiseases).to.equal(2); // Two patients have diseases
      expect(avgDiseases).to.equal(66); // (2 diseases / 3 patients) * 100 = 66.66 -> 66
    });

    it("should return all patient names for statistics", async function () {
      const names = await medicalRecordsContract.getAllPatientNames();
      
      expect(names.length).to.equal(3);
      expect(names).to.include("Patient One");
      expect(names).to.include("Patient Two");
      expect(names).to.include("Patient Three");
    });

    it("should return correct foundation patient count", async function () {
      const foundationCount = await medicalRecordsContract.getFoundationPatientCount(signers.foundation.address);
      expect(foundationCount).to.equal(3);
      
      // Test with foundation that has no patients
      const zeroCount = await medicalRecordsContract.getFoundationPatientCount(signers.doctor.address);
      expect(zeroCount).to.equal(0);
    });

    it("should return patients by foundation", async function () {
      const foundationPatients = await medicalRecordsContract.getPatientsByFoundation(signers.foundation.address);
      
      expect(foundationPatients.length).to.equal(3);
      expect(foundationPatients).to.include(signers.patient.address);
      expect(foundationPatients).to.include(signers.doctor.address);
      expect(foundationPatients).to.include(signers.unauthorizedUser.address);
    });

    it("should return patient registration batch data", async function () {
      const [names, timestamps, foundations, diseaseCounts] = await medicalRecordsContract
        .getPatientRegistrationBatch(0, 2);
      
      expect(names.length).to.equal(2);
      expect(timestamps.length).to.equal(2);
      expect(foundations.length).to.equal(2);
      expect(diseaseCounts.length).to.equal(2);
      
      // All should be registered by the same foundation
      expect(foundations[0]).to.equal(signers.foundation.address);
      expect(foundations[1]).to.equal(signers.foundation.address);
      
      // Disease counts should match (first two patients have 1 disease each)
      expect(diseaseCounts[0]).to.equal(1);
      expect(diseaseCounts[1]).to.equal(1);
    });

    it("should handle registration timeline correctly", async function () {
      // Test with 1 day time range (86400 seconds)
      const timeline = await medicalRecordsContract.getRegistrationTimeline(86400);
      
      expect(timeline.length).to.be.greaterThan(0);
      
      // Sum of timeline should equal total patients
      let timelineSum = 0;
      for (let i = 0; i < timeline.length; i++) {
        timelineSum += Number(timeline[i]);
      }
      expect(timelineSum).to.equal(3);
    });
  });

  describe("Enhanced Patient Information Access", function () {
    beforeEach(async function () {
      // Register patient
      const patient = signers.patient.address;

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );

      // Add multiple diseases
      const diseases = [testDisease1, testDisease2];
      for (const disease of diseases) {
        const diseaseBytes = Buffer.from(disease, 'utf8');
        const diseaseInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
        
        for (let i = 0; i < diseaseBytes.length; i++) {
          diseaseInput.add8(diseaseBytes[i]);
        }
        
        const diseaseEncrypted = await diseaseInput.encrypt();

        await medicalRecordsContract
          .connect(signers.foundation)
          .addDisease(
            patient,
            diseaseEncrypted.handles,
            diseaseBytes.length,
            diseaseEncrypted.inputProof
          );
      }
    });

    it("should return complete patient info with public name", async function () {
      const patient = signers.patient.address;

      const [name, foundation, timestamp, diseaseCount] = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientInfo(patient);

      expect(name).to.equal(testPatientName);
      expect(foundation).to.equal(signers.foundation.address);
      expect(timestamp).to.be.greaterThan(0);
      expect(diseaseCount).to.equal(2);
    });

    it("should maintain disease encryption and access control", async function () {
      const patient = signers.patient.address;

      // Foundation should be able to access diseases
      const [encryptedDiseaseData, diseaseLength] = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientDisease(patient, 0);

      expect(encryptedDiseaseData.length).to.be.greaterThan(0);
      expect(diseaseLength).to.equal(Buffer.from(testDisease1, 'utf8').length);

      // Unauthorized user should not be able to access diseases
      await expect(
        medicalRecordsContract
          .connect(signers.unauthorizedUser)
          .getPatientDisease(patient, 0)
      ).to.be.revertedWith("Not authorized to access this patient's data");
    });
  });

  describe("Public Statistics Access", function () {
    it("should allow anyone to access system statistics", async function () {
      // Register a patient first
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          signers.patient.address,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );

      // Unauthorized user should be able to access public statistics
      const totalPatients = await medicalRecordsContract
        .connect(signers.unauthorizedUser)
        .getTotalPatients();
      
      expect(totalPatients).to.equal(1);

      const [total, diseases, avg] = await medicalRecordsContract
        .connect(signers.unauthorizedUser)
        .getSystemStatistics();
      
      expect(total).to.equal(1);
    });

    it("should allow anyone to access patient names for statistics", async function () {
      // Register patients
      const patients = ["Alice Johnson", "Bob Smith"];
      
      for (let i = 0; i < patients.length; i++) {
        const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
        encryptedInput.add32(testPatientId + i);
        const encrypted = await encryptedInput.encrypt();

        await medicalRecordsContract
          .connect(signers.foundation)
          .registerPatient(
            signers[Object.keys(signers)[i + 2] as keyof Signers].address,
            patients[i],
            encrypted.handles[0],
            encrypted.inputProof
          );
      }

      // Unauthorized user should be able to get names for statistics
      const names = await medicalRecordsContract
        .connect(signers.unauthorizedUser)
        .getAllPatientNames();
      
      expect(names).to.include("Alice Johnson");
      expect(names).to.include("Bob Smith");
    });
  });
});