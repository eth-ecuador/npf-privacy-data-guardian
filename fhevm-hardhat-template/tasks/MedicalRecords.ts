import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";

/**
 * Tutorial: Deploy and Interact with MedicalRecords Foundation System
 * ==================================================================
 *
 * 1. Local deployment:
 *   npx hardhat node
 *   npx hardhat --network localhost deploy --tags MedicalRecords
 *
 * 2. Authorize foundation (if not owner):
 *   npx hardhat --network localhost medical:authorize-foundation --foundation 0x...
 *
 * 3. Register patient (as foundation):
 *   npx hardhat --network localhost medical:register-patient --patient 0x... --name "Juan Perez" --id 12345
 *
 * 4. Add disease:
 *   npx hardhat --network localhost medical:add-disease --patient 0x... --disease "Diabetes Type 2"
 *
 * 5. Grant access to doctor:
 *   npx hardhat --network localhost medical:grant-access --authorized 0x... (as patient)
 *
 * 6. View patient data:
 *   npx hardhat --network localhost medical:get-patient-info --patient 0x...
 *   npx hardhat --network localhost medical:decrypt-patient-name --patient 0x...
 */

/**
 * Helper functions for string encryption
 */
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

/**
 * Get MedicalRecords contract address
 */
task("medical:address", "Prints the MedicalRecords address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const medicalRecords = await deployments.get("MedicalRecords");
  console.log("MedicalRecords address is " + medicalRecords.address);
});

/**
 * Check if foundation is authorized
 */
task("medical:check-foundation", "Check if a foundation is authorized")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("foundation", "Foundation address to check")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const foundationAddress = taskArguments.foundation;

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    const isAuthorized = await medicalContract.isFoundationAuthorized(foundationAddress);
    console.log(`Foundation ${foundationAddress} is ${isAuthorized ? 'authorized' : 'not authorized'}`);
  });

/**
 * Authorize foundation (only owner)
 */
task("medical:authorize-foundation", "Authorize a foundation to register patients")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("foundation", "Foundation address to authorize")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const foundationAddress = taskArguments.foundation;

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    const tx = await medicalContract
      .connect(signers[0])
      .authorizeFoundation(foundationAddress);

    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx: ${tx.hash} status=${receipt?.status}`);
    console.log(`Foundation ${foundationAddress} authorized successfully!`);
  });

/**
 * Register a new patient (only authorized foundations)
 */
task("medical:register-patient", "Register a new patient with encrypted data")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .addParam("name", "Patient name")
  .addParam("id", "Patient ID number")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const patientAddress = taskArguments.patient;
    const patientName = taskArguments.name;
    const patientId = parseInt(taskArguments.id);

    if (!Number.isInteger(patientId)) {
      throw new Error("Patient ID must be an integer");
    }

    await fhevm.initializeCLIApi();

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");
    
    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    // Convert name to bytes
    const nameBytes = stringToUint8Array(patientName);
    console.log(`Name "${patientName}" converted to ${nameBytes.length} bytes`);

    // Create encrypted input for name bytes and ID
    const encryptedInput = await fhevm
      .createEncryptedInput(medicalRecordsDeployment.address, signers[0].address);
    
    // Add each byte of the name
    for (let i = 0; i < nameBytes.length; i++) {
      encryptedInput.add8(nameBytes[i]);
    }
    
    // Add patient ID
    encryptedInput.add32(patientId);
    
    const encrypted = await encryptedInput.encrypt();

    // Prepare name handles (all bytes except the last one which is the ID)
    const nameHandles = encrypted.handles.slice(0, nameBytes.length);

    const tx = await medicalContract
      .connect(signers[0])
      .registerPatient(
        patientAddress,
        nameHandles,                              // Array of encrypted bytes
        nameBytes.length,                         // Name length
        encrypted.handles[nameBytes.length],      // Patient ID handle
        encrypted.inputProof
      );

    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx: ${tx.hash} status=${receipt?.status}`);
    console.log(`Patient ${patientName} registered successfully at address ${patientAddress}!`);
  });

/**
 * Add disease to patient
 */
task("medical:add-disease", "Add an encrypted disease to a patient")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .addParam("disease", "Disease name")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const patientAddress = taskArguments.patient;
    const diseaseName = taskArguments.disease;

    await fhevm.initializeCLIApi();

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    // Convert disease to bytes
    const diseaseBytes = stringToUint8Array(diseaseName);
    console.log(`Disease "${diseaseName}" converted to ${diseaseBytes.length} bytes`);

    // Create encrypted input for disease bytes
    const encryptedInput = await fhevm
      .createEncryptedInput(medicalRecordsDeployment.address, signers[0].address);
    
    // Add each byte of the disease
    for (let i = 0; i < diseaseBytes.length; i++) {
      encryptedInput.add8(diseaseBytes[i]);
    }
    
    const encrypted = await encryptedInput.encrypt();

    const tx = await medicalContract
      .connect(signers[0])
      .addDisease(
        patientAddress,
        encrypted.handles,        // Array of encrypted bytes
        diseaseBytes.length,      // Disease length
        encrypted.inputProof
      );

    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx: ${tx.hash} status=${receipt?.status}`);
    console.log(`Disease "${diseaseName}" added to patient ${patientAddress}`);
  });

/**
 * Get patient basic info (non-encrypted)
 */
task("medical:get-patient-info", "Get patient basic information")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const patientAddress = taskArguments.patient;

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    try {
      const [foundation, timestamp, diseaseCount] = await medicalContract.getPatientInfo(patientAddress);
      
      console.log(`Patient: ${patientAddress}`);
      console.log(`Registering foundation: ${foundation}`);
      console.log(`Registration time: ${new Date(Number(timestamp) * 1000).toLocaleString()}`);
      console.log(`Number of diseases: ${diseaseCount}`);
    } catch (error) {
      console.error("Error getting patient info:", error);
    }
  });

/**
 * Decrypt patient name
 */
task("medical:decrypt-patient-name", "Decrypt and display patient name")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const patientAddress = taskArguments.patient;

    await fhevm.initializeCLIApi();

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    try {
      const [encryptedNameData, nameLength] = await medicalContract.getPatientName(patientAddress);
      
      console.log(`Encrypted name data length: ${encryptedNameData.length}`);
      console.log(`Actual name length: ${nameLength}`);

      // Decrypt each byte
      const decryptedBytes = new Uint8Array(Number(nameLength));
      
      for (let i = 0; i < Number(nameLength); i++) {
        const decryptedByte = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedNameData[i],
          medicalRecordsDeployment.address,
          signers[0]
        );
        decryptedBytes[i] = Number(decryptedByte);
      }

      const decryptedName = Buffer.from(decryptedBytes).toString('utf8');

      console.log(`Patient address: ${patientAddress}`);
      console.log(`Decrypted name: "${decryptedName}"`);
    } catch (error) {
      console.error("Error decrypting patient name:", error);
    }
  });

/**
 * Decrypt patient ID
 */
task("medical:decrypt-patient-id", "Decrypt and display patient ID")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const patientAddress = taskArguments.patient;

    await fhevm.initializeCLIApi();

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    try {
      const encryptedId = await medicalContract.getPatientId(patientAddress);

      const clearId = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encryptedId,
        medicalRecordsDeployment.address,
        signers[0]
      );

      console.log(`Patient address: ${patientAddress}`);
      console.log(`Decrypted ID: ${clearId}`);
    } catch (error) {
      console.error("Error decrypting patient ID:", error);
    }
  });

/**
 * Decrypt patient disease by index
 */
task("medical:decrypt-patient-disease", "Decrypt and display a specific patient disease")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("patient", "Patient address")
  .addParam("index", "Disease index")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const patientAddress = taskArguments.patient;
    const diseaseIndex = parseInt(taskArguments.index);

    if (!Number.isInteger(diseaseIndex) || diseaseIndex < 0) {
      throw new Error("Disease index must be a non-negative integer");
    }

    await fhevm.initializeCLIApi();

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    try {
      const [encryptedDiseaseData, diseaseLength] = await medicalContract.getPatientDisease(patientAddress, diseaseIndex);
      
      console.log(`Encrypted disease data length: ${encryptedDiseaseData.length}`);
      console.log(`Actual disease length: ${diseaseLength}`);

      // Decrypt each byte
      const decryptedBytes = new Uint8Array(Number(diseaseLength));
      
      for (let i = 0; i < Number(diseaseLength); i++) {
        const decryptedByte = await fhevm.userDecryptEuint(
          FhevmType.euint8,
          encryptedDiseaseData[i],
          medicalRecordsDeployment.address,
          signers[0]
        );
        decryptedBytes[i] = Number(decryptedByte);
      }

      const decryptedDisease = Buffer.from(decryptedBytes).toString('utf8');

      console.log(`Patient address: ${patientAddress}`);
      console.log(`Disease index: ${diseaseIndex}`);
      console.log(`Decrypted disease: "${decryptedDisease}"`);
    } catch (error) {
      console.error("Error decrypting patient disease:", error);
    }
  });

/**
 * Grant access to authorized entity (patient action)
 */
task("medical:grant-access", "Grant access to an authorized entity (doctor/foundation)")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .addParam("authorized", "Authorized entity address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const authorizedAddress = taskArguments.authorized;

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const signers = await ethers.getSigners();
    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    const tx = await medicalContract
      .connect(signers[0])
      .grantAccess(authorizedAddress);

    console.log(`Wait for tx: ${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx: ${tx.hash} status=${receipt?.status}`);
    console.log(`Access granted to: ${authorizedAddress}`);
  });

/**
 * Get total patients count
 */
task("medical:total-patients", "Get total number of registered patients")
  .addOptionalParam("contract", "Optionally specify the MedicalRecords contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const medicalRecordsDeployment = taskArguments.contract
      ? { address: taskArguments.contract }
      : await deployments.get("MedicalRecords");

    console.log(`MedicalRecords: ${medicalRecordsDeployment.address}`);

    const medicalContract = await ethers.getContractAt("MedicalRecords", medicalRecordsDeployment.address);

    const totalPatients = await medicalContract.getTotalPatients();
    console.log(`Total registered patients: ${totalPatients}`);
  });