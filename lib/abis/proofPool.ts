export const proofPoolAbi = [
  {
    "type": "function",
    "name": "createTask",
    "inputs": [
      {
        "name": "title",
        "type": "string"
      },
      {
        "name": "description",
        "type": "string"
      },
      {
        "name": "acceptanceCriteria",
        "type": "string"
      },
      {
        "name": "reward",
        "type": "uint256"
      },
      {
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitProof",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      },
      {
        "name": "proof",
        "type": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "closeTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      },
      {
        "name": "agent",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reject",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      },
      {
        "name": "agent",
        "type": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancel",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "taskCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "creator",
            "type": "address"
          },
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "acceptanceCriteria",
            "type": "string"
          },
          {
            "name": "reward",
            "type": "uint256"
          },
          {
            "name": "deadline",
            "type": "uint256"
          },
          {
            "name": "state",
            "type": "uint8"
          },
          {
            "name": "winner",
            "type": "address"
          },
          {
            "name": "submissionCount",
            "type": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getDerivedState",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubmissions",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {
            "name": "agent",
            "type": "address"
          },
          {
            "name": "proof",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "name": "status",
            "type": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubmission",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      },
      {
        "name": "agent",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "agent",
            "type": "address"
          },
          {
            "name": "proof",
            "type": "string"
          },
          {
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "name": "status",
            "type": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSubmission",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256"
      },
      {
        "name": "agent",
        "type": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view"
  }
] as const;
