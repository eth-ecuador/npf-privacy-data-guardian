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

describe("MedicalRecords Foundation System", function () {
  let signers: Signers;
  let medicalRecordsContract: MedicalRecords;
  let contractAddress: string;

  const testPatientName = "Juan";  // Shortened for testing
  const testPatientId = 12345;
  const testDisease1 = "Diabetes";

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
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
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

    it("should not allow non-owner to authorize foundations", async function () {
      await expect(
        medicalRecordsContract.connect(signers.unauthorizedUser).authorizeFoundation(signers.doctor.address)
      ).to.be.revertedWith("Only owner can perform this action");
    });
  });

  describe("Patient Registration", function () {
    it("should register a new patient successfully", async function () {
      const patient = signers.patient.address;
      
      // Convert name to bytes using Buffer (Node.js compatible)
      const nameBytes = Buffer.from(testPatientName, 'utf8');

      // Create encrypted input
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      
      // Add each byte of the name
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      
      // Add patient ID
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      await expect(
        medicalRecordsContract
          .connect(signers.foundation)
          .registerPatient(
            patient,
            nameHandles,
            nameBytes.length,
            encrypted.handles[nameBytes.length],
            encrypted.inputProof
          )
      ).to.emit(medicalRecordsContract, "PatientRegistered")
       .withArgs(patient, signers.foundation.address);

      expect(await medicalRecordsContract.isPatientRegistered(patient)).to.be.true;
      expect(await medicalRecordsContract.getTotalPatients()).to.equal(1);
    });

    it("should not allow unauthorized users to register patients", async function () {
      const patient = signers.patient.address;
      const nameBytes = Buffer.from(testPatientName, 'utf8');

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.unauthorizedUser.address);
      
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      await expect(
        medicalRecordsContract
          .connect(signers.unauthorizedUser)
          .registerPatient(
            patient,
            nameHandles,
            nameBytes.length,
            encrypted.handles[nameBytes.length],
            encrypted.inputProof
          )
      ).to.be.revertedWith("Not an authorized foundation");
    });

    it("should decrypt patient data correctly", async function () {
      const patient = signers.patient.address;
      const nameBytes = Buffer.from(testPatientName, 'utf8');

      // Register patient
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          nameHandles,
          nameBytes.length,
          encrypted.handles[nameBytes.length],
          encrypted.inputProof
        );

      // Get and decrypt patient name
      const [encryptedNameData, nameLength] = await medicalRecordsContract
        .connect(signers.foundation)
        .getPatientName(patient);

      expect(encryptedNameData.length).to.be.greaterThan(0);
      expect(nameLength).to.equal(nameBytes.length);

      // Decrypt name bytes
      const decryptedBytes = new Array(Number(nameLength));
      for (let i = 0; i < Number(nameLength); i++) {
        const decryptedByte = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedNameData[i],
          contractAddress,
          signers.foundation
        );
        decryptedBytes[i] = Number(decryptedByte);
      }

      const decryptedName = Buffer.from(decryptedBytes).toString('utf8');
      expect(decryptedName).to.equal(testPatientName);

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
  });

  describe("Disease Management", function () {
    beforeEach(async function () {
      // Register patient first
      const patient = signers.patient.address;
      const nameBytes = Buffer.from(testPatientName, 'utf8');

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          nameHandles,
          nameBytes.length,
          encrypted.handles[nameBytes.length],
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
      const nameBytes = Buffer.from(testPatientName, 'utf8');

      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          patient,
          nameHandles,
          nameBytes.length,
          encrypted.handles[nameBytes.length],
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

    it("should not allow unauthorized access to patient data", async function () {
      const patient = signers.patient.address;

      await expect(
        medicalRecordsContract
          .connect(signers.unauthorizedUser)
          .getPatientName(patient)
      ).to.be.revertedWith("Not authorized to access this patient's data");
    });
  });
});