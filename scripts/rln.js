const { RLN, Registry } = require("rlnjs");
const { ethers } = require("hardhat")
const path = require('path')
const fs = require('fs')
const { hexlify } = require('@ethersproject/bytes')
const { keccak256 } = require('@ethersproject/solidity')
const { toUtf8Bytes } = require('@ethersproject/strings')

const zkeyFilesPath = "./build/zkeyFiles"
const vkeyPath = path.join(zkeyFilesPath, "verification_key.json")
const vKey = JSON.parse(fs.readFileSync(vkeyPath, "utf-8"))
const wasmFilePath = path.join(zkeyFilesPath, "rln.wasm")
const finalZkeyPath = path.join(zkeyFilesPath, "rln_final.zkey")

// Instantiate RLN
const rlnInstance = new RLN(wasmFilePath, finalZkeyPath, vKey)
const registryInstance = new Registry()
registryInstance.addMember(rlnInstance.commitment)

// Example of accessing the generated identity commitment
// const identity = rlnInstance.identity()
// const identityCommitment = rlnInstance.commitment()

//function genNullifier()

async function verifyOnChain(){
    const epoch = 123
    const signal = 0
    const merkleProof = registryInstance.generateMerkleProof(rlnInstance.commitment) // Read more about creating a registryInstance below
    const proof = await rlnInstance.generateProof(signal, merkleProof, epoch)
    const verifierFactory = await ethers.getContractFactory("Verifier");
    const verifierContract = await verifierFactory.deploy();
    await verifierContract.deployed();
    const publicSignals = [
        ethers.BigNumber.from(proof.snarkProof.publicSignals.yShare),
        ethers.BigNumber.from(proof.snarkProof.publicSignals.merkleRoot),
        ethers.BigNumber.from(proof.snarkProof.publicSignals.internalNullifier),
        ethers.BigNumber.from(proof.snarkProof.publicSignals.externalNullifier),
        ethers.BigNumber.from(proof.snarkProof.publicSignals.signalHash),
    ]
    const proofResult = await rlnInstance.verifyProof(proof)
    const pi_a = proof.snarkProof.proof.pi_a.slice(0, 2).map(item=>ethers.BigNumber.from(item))
    const pi_b = proof.snarkProof.proof.pi_b.slice(0, 2).map(([item1, item2])=>(
        [ethers.BigNumber.from(item1),ethers.BigNumber.from(item2) ]
    ))
    const pi_c = proof.snarkProof.proof.pi_c.slice(0, 2).map(item=>ethers.BigNumber.from(item))
    
    console.log(pi_a)
    console.log(pi_b)
    console.log(pi_c)
    console.log(publicSignals)

    const res = await verifierContract.verifyProof(
        pi_a,
        pi_b,
        pi_c,
        publicSignals);
    console.log(res)
}

verifyOnChain()