const { RLN, Registry } = require("rlnjs");
const { ethers } = require("hardhat")
const path = require('path')
const fs = require('fs')
const { hexlify } = require('@ethersproject/bytes')
const { keccak256 } = require('@ethersproject/solidity')
const { toUtf8Bytes } = require('@ethersproject/strings')
const { groth16 } = require('snarkjs')

const zkeyFilesPath = "./build/zkeyFiles"
const vkeyPath = path.join(zkeyFilesPath, "verification_key.json")
const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
const wasmFilePath = path.join(zkeyFilesPath, "rln.wasm")
const finalZkeyPath = path.join(zkeyFilesPath, "rln_final.zkey")

// Instantiate RLN
const rlnInstance = new RLN(wasmFilePath, finalZkeyPath, vKey)
const registryInstance = new Registry()
registryInstance.addMember(rlnInstance.commitment)

async function verifyOnChain(){
    const epoch = 123
    const signal = 0
    const merkleProof = registryInstance.generateMerkleProof(rlnInstance.commitment) // Read more about creating a registryInstance below
    const proof = await rlnInstance.generateProof(signal, merkleProof, epoch)
    const verifierFactory = await ethers.getContractFactory("Verifier");
    const verifierContract = await verifierFactory.deploy();
    await verifierContract.deployed();
    const publicSignals = [
        proof.snarkProof.publicSignals.yShare,
        proof.snarkProof.publicSignals.merkleRoot,
        proof.snarkProof.publicSignals.internalNullifier,
        proof.snarkProof.publicSignals.externalNullifier,
        proof.snarkProof.publicSignals.signalHash,
    ]
    console.log(publicSignals)
    const solidityCallData = await groth16.exportSolidityCallData(proof.snarkProof.proof, publicSignals)
    console.log(solidityCallData)
}

verifyOnChain()