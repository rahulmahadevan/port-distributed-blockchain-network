# port-distributed-blockchain-network

Blockchain is a distributed ledger technology in which nodes communicate with each other in a cryptographically secure manner. All nodes in the blockchain network have their own copy of the ledger. Consistency is maintained between the nodes using some consensus algorithm. All transactions are verified using digital signature and ledge itself is practically tamper-proof due to the unique hashing machanism of the blockchain.

This Node.js project is an implementation of the Blockchain Technology in a local environment by creating a distributed network among different ports within a system.

The following features of blockchain are implemented in this project:
1. Distributed System (nodes run on different ports simultaneously)
2. Cryptographically secure (RSA, SHA256)
3. Execute Transaction (send coins to other users)
4. Transaction Verification (using digital signature)
5. Proof of Work Mining
6. Block Verification (validating transactions by generating markle root,
checking previous block hash from own ledger, and computing block
hash with the received values)
7. Locally public network (new nodes receive the ledger from existing
node)
8. User Interface

Installation Steps:

It is required to install node.js and npm to install project dependencies like crypto,
express libraries used in the code.
  1. Install Node.js and npm from Ubuntu repository
    $ sudo apt update
    $ sudo apt install nodejs npm
  2. Check installation
    $ node --version
    $ npm --version
  3. Download “Code” folder
  4. Install project dependencies
    a. Open terminal from the Code folder where package.json is located and run the following command:
        $ npm install
  5. Start a blockchain node
    a. From the same project folder in terminal run:
        $ npm start 3000
       where 3000 is the port number of the current node
    b. Open browser and goto http://localhost:3000
  6. Start another node
    a. In a new terminal window run (without closing the previous one):
      $ npm start 3001
    b. In a new browser window goto http://localhost:3001

Run multiple nodes in parallel without closing the terminal windows. Use port
numbers starting from 3000 upto 3005 only. Change lastPort variable in utils.js to
any value beyond 3005 to add more nodes.
