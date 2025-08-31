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

describe("MedicalRecordsSepolia Foundation System v2", function () {
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
      console.warn("This hardhat test suite can only run on Sepolia Testnet");
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

  it("should register patient and manage medical records on Sepolia v2", async function () {
    steps = 18;
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

      progress("Creating encrypted input for patient ID only...");
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      
      // Add only patient ID (name is now public)
      encryptedInput.add32(testPatientId);
      
      const encrypted = await encryptedInput.encrypt();

      progress(`Registering patient at MedicalRecords=${contractAddress}...`);
      const registerTx = await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          signers.patient.address,
          testPatientName,           // Public name
          encrypted.handles[0],      // Encrypted ID
          encrypted.inputProof
        );
      
      progress(`Waiting for registration tx: ${registerTx.hash}...`);
      await registerTx.wait();
      progress("Patient registered successfully!");
    } else {
      progress("Patient already registered, skipping registration...");
    }

    progress("Getting patient basic information...");
    const [name, foundation, timestamp, diseaseCount] = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientInfo(signers.patient.address);
    
    progress(`Patient info - Name: ${name}, Foundation: ${foundation}, Diseases: ${diseaseCount}`);

    progress("Getting public patient name (no decryption needed)...");
    const publicName = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientName(signers.patient.address);

    progress(`Public patient name: "${publicName}"`);

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
    const [, , , updatedDiseaseCount] = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientInfo(signers.patient.address);
    
    progress(`Updated disease count: ${updatedDiseaseCount}`);

    progress("Testing new statistics functions...");
    const [totalPatients, totalDiseases, avgDiseases] = await medicalRecordsContract.getSystemStatistics();
    progress(`Statistics - Patients: ${totalPatients}, Diseases: ${totalDiseases}, Avg: ${Number(avgDiseases)/100}`);

    // Basic validations
    expect(publicName).to.equal(testPatientName);
    expect(decryptedId).to.equal(testPatientId);
    expect(Number(updatedDiseaseCount)).to.be.greaterThan(0);
    expect(Number(totalPatients)).to.be.greaterThan(0);
  });

  it("should manage access permissions on Sepolia v2", async function () {
    steps = 12;
    this.timeout(10 * 60000); // 10 minutes timeout

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Checking current doctor access status...");
    const hasAccess = await medicalRecordsContract.authorizedAccess(
      signers.patient.address, 
      signers.doctor.address
    );
    
    if (!hasAccess) {
      progress("Patient granting doctor access...");
      const grantTx = await medicalRecordsContract
        .connect(signers.patient)
        .grantAccess(signers.doctor.address);

      progress(`Waiting for grant access tx: ${grantTx.hash}...`);
      await grantTx.wait();
    } else {
      progress("Doctor already has access...");
    }

    progress("Verifying doctor can access patient information...");
    const [name, foundationAddress, timestamp, diseaseCount] = await medicalRecordsContract
      .connect(signers.doctor)
      .getPatientInfo(signers.patient.address);

    progress(`Doctor access verified - Name: ${name}, Foundation: ${foundationAddress}, Diseases: ${diseaseCount}`);

    progress("Testing doctor access to public patient name...");
    const publicName = await medicalRecordsContract
      .connect(signers.doctor)
      .getPatientName(signers.patient.address);

    progress(`Doctor accessed public name: "${publicName}"`);

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
    expect(publicName).to.equal(testPatientName);
  });

  it("should test statistics functions on Sepolia", async function () {
    steps = 10;
    this.timeout(8 * 60000); // 8 minutes timeout

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Getting system statistics...");
    const [totalPatients, totalDiseases, avgDiseases] = await medicalRecordsContract.getSystemStatistics();
    progress(`System Stats - Patients: ${totalPatients}, Diseases: ${totalDiseases}, Avg: ${Number(avgDiseases)/100}`);

    progress("Getting all patient names for statistics...");
    const allNames = await medicalRecordsContract.getAllPatientNames();
    progress(`Retrieved ${allNames.length} patient names for analysis`);

    progress("Getting foundation patient count...");
    const foundationCount = await medicalRecordsContract.getFoundationPatientCount(signers.foundation.address);
    progress(`Foundation has registered ${foundationCount} patients`);

    progress("Getting patients by foundation...");
    const foundationPatients = await medicalRecordsContract.getPatientsByFoundation(signers.foundation.address);
    progress(`Foundation manages ${foundationPatients.length} patients`);

    progress("Testing patient registration batch function...");
    if (Number(totalPatients) > 0) {
      const batchSize = Number(totalPatients) > 5 ? 5 : Number(totalPatients);
      const [names, timestamps, foundations, diseaseCounts] = await medicalRecordsContract
        .getPatientRegistrationBatch(0, batchSize);
      
      progress(`Batch data retrieved: ${names.length} records`);
      
      expect(names.length).to.equal(batchSize);
      expect(timestamps.length).to.equal(batchSize);
      expect(foundations.length).to.equal(batchSize);
      expect(diseaseCounts.length).to.equal(batchSize);
    }

    progress("Testing registration timeline...");
    const timeline = await medicalRecordsContract.getRegistrationTimeline(86400); // 1 day periods
    progress(`Registration timeline has ${timeline.length} periods`);

    progress("Getting total registrations...");
    const totalRegistrations = await medicalRecordsContract.getTotalRegistrations();
    progress(`Total registrations: ${totalRegistrations}`);

    progress("Statistics test completed!");

    // Basic validations
    expect(Number(totalPatients)).to.be.greaterThan(0);
    expect(Number(totalRegistrations)).to.be.greaterThan(0);
    expect(allNames.length).to.equal(Number(totalPatients));
  });

  it("should test public access to statistics on Sepolia", async function () {
    steps = 6;
    this.timeout(5 * 60000); // 5 minutes timeout

    progress("Testing public access to statistics (no authentication required)...");
    
    progress("Getting total patients (public access)...");
    const totalPatients = await medicalRecordsContract
      .connect(signers.doctor) // Using doctor (not foundation) to test public access
      .getTotalPatients();
    progress(`Public access - Total patients: ${totalPatients}`);

    progress("Getting system statistics (public access)...");
    const [patients, diseases, avg] = await medicalRecordsContract
      .connect(signers.doctor)
      .getSystemStatistics();
    progress(`Public stats - Patients: ${patients}, Diseases: ${diseases}, Avg: ${Number(avg)/100}`);

    progress("Getting all patient names (public access)...");
    const names = await medicalRecordsContract
      .connect(signers.doctor)
      .getAllPatientNames();
    progress(`Public access retrieved ${names.length} patient names`);

    progress("Testing registration timeline (public access)...");
    const timeline = await medicalRecordsContract
      .connect(signers.doctor)
      .getRegistrationTimeline(86400);
    progress(`Public timeline access successful: ${timeline.length} periods`);

    progress("Public statistics access test completed!");

    // Validations
    expect(Number(totalPatients)).to.be.greaterThan(0);
    expect(names.length).to.equal(Number(patients));
  });

  it("should test foundation authorization and management on Sepolia", async function () {
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

    progress("Getting total registrations...");
    const totalRegistrations = await medicalRecordsContract.getTotalRegistrations();
    progress(`Total registrations: ${totalRegistrations}`);

    progress("Testing patient registration check...");
    const isPatientRegistered = await medicalRecordsContract.isPatientRegistered(signers.patient.address);
    progress(`Patient ${signers.patient.address} is ${isPatientRegistered ? 'registered' : 'not registered'}`);
    
    progress("Foundation management test completed!");
    
    // Basic validations
    expect(isAuthorized).to.be.true;
    expect(Number(totalPatients)).to.be.greaterThan(0);
    expect(Number(totalRegistrations)).to.be.greaterThan(0);
  });

  it("should test disease management and statistics on Sepolia", async function () {
    steps = 12;
    this.timeout(10 * 60000); // 10 minutes timeout

    progress("Initializing FHEVM CLI API...");
    await fhevm.initializeCLIApi();

    progress("Checking if test patient exists...");
    const patientExists = await medicalRecordsContract.isPatientRegistered(signers.patient.address);
    
    if (!patientExists) {
      progress("Registering test patient for disease testing...");
      const encryptedInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
      encryptedInput.add32(testPatientId);
      const encrypted = await encryptedInput.encrypt();

      const registerTx = await medicalRecordsContract
        .connect(signers.foundation)
        .registerPatient(
          signers.patient.address,
          testPatientName,
          encrypted.handles[0],
          encrypted.inputProof
        );
      
      await registerTx.wait();
      progress("Test patient registered");
    } else {
      progress("Test patient already exists");
    }

    progress("Getting current disease count...");
    const currentDiseaseCount = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientDiseaseCount(signers.patient.address);
    progress(`Current diseases: ${currentDiseaseCount}`);

    progress("Adding new disease to patient...");
    const diseaseBytes = Buffer.from(testDisease, 'utf8');
    const diseaseInput = await fhevm.createEncryptedInput(contractAddress, signers.foundation.address);
    
    for (let i = 0; i < diseaseBytes.length; i++) {
      diseaseInput.add8(diseaseBytes[i]);
    }
    
    const diseaseEncrypted = await diseaseInput.encrypt();

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

    progress("Getting updated disease count...");
    const updatedDiseaseCount = await medicalRecordsContract
      .connect(signers.foundation)
      .getPatientDiseaseCount(signers.patient.address);
    progress(`Updated disease count: ${updatedDiseaseCount}`);

    progress("Getting updated system statistics...");
    const [totalPatients, totalDiseases, avgDiseases] = await medicalRecordsContract.getSystemStatistics();
    progress(`Updated stats - Patients: ${totalPatients}, Diseases: ${totalDiseases}, Avg: ${Number(avgDiseases)/100}`);

    progress("Getting foundation statistics...");
    const foundationPatientCount = await medicalRecordsContract.getFoundationPatientCount(signers.foundation.address);
    progress(`Foundation manages ${foundationPatientCount} patients`);

    progress("Disease management test completed!");

    // Validations
    expect(Number(updatedDiseaseCount)).to.be.greaterThan(Number(currentDiseaseCount));
    expect(Number(totalPatients)).to.be.greaterThan(0);
    expect(Number(totalDiseases)).to.be.greaterThan(0);
  });
});