import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { MedicalRecords } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  foundation: HardhatEthersSigner;
  patient: HardhatEthersSigner;
  doctor: HardhatEthersSigner;
};

describe("MedicalRecordsSepolia Foundation System", function () {
  let signers: Signers;
  let medicalRecordsContract: MedicalRecords;
  let contractAddress: string;
  let step: number;
  let steps: number;

  const testPatientName = "Juan Perez Test";
  const testPatientId = 99999;
  const testDisease = "Diabetes Type 2";

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const medicalRecordsDeployment = await deployments.get("MedicalRecords");
      contractAddress = medicalRecordsDeployment.address;
      medicalRecordsContract = await ethers.getContractAt("MedicalRecords", contractAddress);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia --tags MedicalRecords'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { foundation: ethSigners[0], patient: ethSigners[1], doctor: ethSigners[2] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should register patient and manage medical records on Sepolia", async function () {
    steps = 20;
    this.timeout(12 * 60000); // 12 minutes timeout for real network operations

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Checking if foundation is authorized...");
    const isAuthorized = await medicalRecordsContract.isFoundationAuthorized(signers.foundation.address);
    
    if (!isAuthorized) {
      progress("Authorizing foundation...");
      const authTx = await medicalRecordsContract
        .connect(signers.foundation)
        .authorizeFoundation(signers.foundation.address);
      
      progress(`Waiting for authorization tx: ${authTx.hash}...`);
      await authTx.wait();
    } else {
      progress("Foundation already authorized");
    }

    // Check if patient is already registered
    progress("Checking if patient already exists...");
    const patientExists = await medicalRecordsContract.isPatientRegistered(signers.patient.address);
    
    if (!patientExists) {
      progress(`Preparing patient data: "${testPatientName}", ID: ${testPatientId}`);
      const nameBytes = Buffer.from(testPatientName, 'utf8');
      
      progress(`Converting name to ${nameBytes.length} bytes...`);

      progress("Creating encrypted input for patient registration...");
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      
      // Add each byte of the name
      for (let i = 0; i < nameBytes.length; i++) {
        encryptedInput.add8(nameBytes[i]);
      }
      
      // Add patient ID
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();
      const nameHandles = encrypted.handles.slice(0, nameBytes.length);

      progress(`Registering patient at MedicalRecords=${contractAddress}...`);
      const registerTx = await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          signers.patient.address,
          nameHandles,
          nameBytes.length,
          encrypted.handles[nameBytes.length], // ID handle
          encrypted.inputProof
        );
      
      progress(`Waiting for registration tx: ${registerTx.hash}...`);
      await registerTx.wait();
      progress("Patient registered successfully!");
    } else {
      progress("Patient already registered, skipping registration...");
    }

    progress("Getting patient basic information...");
    const [foundation, timestamp, diseaseCount] = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientInfo(signers.patient.address);
    
    progress(`Patient info - Foundation: ${foundation}, Timestamp: ${timestamp}, Diseases: ${diseaseCount}`);

    progress("Getting encrypted patient name...");
    const [encryptedNameData, nameLength] = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientName(signers.patient.address);

    progress(`Encrypted name data length: ${encryptedNameData.length}, actual length: ${nameLength}`);

    progress("Decrypting patient name...");
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
    progress(`Decrypted patient name: "${decryptedName}"`);

    progress("Getting and decrypting patient ID...");
    const encryptedId = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientId(signers.patient.address);

    const decryptedId = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedId,
      contractAddress,
      signers.foundation
    );
    progress(`Decrypted patient ID: ${decryptedId}`);

    progress(`Preparing disease data: "${testDisease}"`);
    const diseaseBytes = Buffer.from(testDisease, 'utf8');

    progress("Creating encrypted input for disease...");
    const diseaseEncryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
    
    for (let i = 0; i < diseaseBytes.length; i++) {
      diseaseEncryptedInput.add8(diseaseBytes[i]);
    }
    
    const diseaseEncrypted = await diseaseEncryptedInput.encrypt();

    progress("Adding disease to patient record...");
    const addDiseaseTx = await medicalRecordsContract
      .connect(signers.foundation)
      .addDisease(
        signers.patient.address,
        diseaseEncrypted.handles,
        diseaseBytes.length,
        diseaseEncrypted.inputProof
      );

    progress(`Waiting for add disease tx: ${addDiseaseTx.hash}...`);
    await addDiseaseTx.wait();

    progress("Getting updated patient information...");
    const [, , updatedDiseaseCount] = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientInfo(signers.patient.address);
    
    progress(`Updated disease count: ${updatedDiseaseCount}`);

    // Basic validations
    expect(decryptedName).to.equal(testPatientName);
    expect(decryptedId).to.equal(testPatientId);
    expect(Number(updatedDiseaseCount)).to.be.greaterThan(0);
  });

  it("should manage access permissions on Sepolia", async function () {
    steps = 14;
    this.timeout(10 * 60000); // 10 minutes timeout

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Checking current doctor access status...");
    const hasAccess = await medicalRecordsContract.authorizedAccess(
      signers.patient.address, 
      signers.doctor.address
    );
    
    if (!hasAccess) {
      progress(`Patient granting doctor access...`);
      const grantTx = await medicalRecordsContract
        .connect(signers.patient)
        .grantAccess(signers.doctor.address);

      progress(`Waiting for grant access tx: ${grantTx.hash}...`);
      await grantTx.wait();
    } else {
      progress("Doctor already has access...");
    }

    progress("Verifying doctor can access patient information...");
    const [foundationAddress, timestamp, diseaseCount] = await medicalRecordsContract
      .connect(signers.doctor)
      .getPatientInfo(signers.patient.address);

    progress(`Doctor access verified - Foundation: ${foundationAddress}, Diseases: ${diseaseCount}`);

    progress("Testing doctor access to encrypted patient name...");
    const [encryptedNameData, nameLength] = await medicalRecordsContract
      .connect(signers.doctor)
      .getPatientName(signers.patient.address);

    progress(`Doctor accessed encrypted name data (${encryptedNameData.length} bytes, length: ${nameLength})`);

    progress("Decrypting patient name as doctor...");
    const decryptedBytes = new Array(Number(nameLength));
    
    for (let i = 0; i < Number(nameLength); i++) {
      const decryptedByte = await fhevm.userDecryptEuint(
        FhevmType.euint8,
        encryptedNameData[i],
        contractAddress,
        signers.doctor
      );
      decryptedBytes[i] = Number(decryptedByte);
    }

    const decryptedName = Buffer.from(decryptedBytes).toString('utf8');
    progress(`Doctor decrypted name: "${decryptedName}"`);

    progress("Getting disease count...");
    const totalDiseases = await medicalRecordsContract
      .connect(signers.doctor)
      .getPatientDiseaseCount(signers.patient.address);

    progress(`Found ${totalDiseases} diseases for patient`);

    if (Number(totalDiseases) > 0) {
      progress("Accessing first disease...");
      const [diseaseData, diseaseLength] = await medicalRecordsContract
        .connect(signers.doctor)
        .getPatientDisease(signers.patient.address, 0);
      
      progress(`Disease data: ${diseaseData.length} bytes, length: ${diseaseLength}`);

      progress("Decrypting first disease...");
      const decryptedDiseaseBytes = new Array(Number(diseaseLength));
      
      for (let i = 0; i < Number(diseaseLength); i++) {
        const decryptedByte = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          diseaseData[i],
          contractAddress,
          signers.doctor
        );
        decryptedDiseaseBytes[i] = Number(decryptedByte);
      }

      const decryptedDisease = Buffer.from(decryptedDiseaseBytes).toString('utf8');
      progress(`Decrypted disease: "${decryptedDisease}"`);
    }

    progress("Getting total patients count...");
    const totalPatients = await medicalRecordsContract.getTotalPatients();
    progress(`Total registered patients in system: ${totalPatients}`);

    // Validations
    expect(diseaseCount).to.be.greaterThan(0);
    expect(totalPatients).to.be.greaterThan(0);
    expect(decryptedName).to.equal(testPatientName);
  });

  it("should test foundation authorization on Sepolia", async function () {
    steps = 8;
    this.timeout(5 * 60000); // 5 minutes timeout

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Checking foundation authorization status...");
    const isAuthorized = await medicalRecordsContract.isFoundationAuthorized(signers.foundation.address);
    
    progress(`Foundation ${signers.foundation.address} is ${isAuthorized ? 'authorized' : 'not authorized'}`);
    
    progress("Getting contract owner...");
    const owner = await medicalRecordsContract.owner();
    progress(`Contract owner: ${owner}`);
    
    progress("Getting total registered patients...");
    const totalPatients = await medicalRecordsContract.getTotalPatients();
    progress(`Total patients: ${totalPatients}`);

    progress("Testing patient registration check...");
    const isPatientRegistered = await medicalRecordsContract.isPatientRegistered(signers.patient.address);
    progress(`Patient ${signers.patient.address} is ${isPatientRegistered ? 'registered' : 'not registered'}`);
    
    progress("Foundation authorization test completed!");
    
    // Basic validations
    expect(isAuthorized).to.be.true;
    expect(totalPatients).to.be.greaterThan(0);
  });
});