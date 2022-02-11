const fs = require('fs');
const { generateKeyPair } = require('crypto');
const crypto = require('crypto');
const http = require('http');
const dir = './blockchain-network';
const path = require('path');
const difficulty = 2;


module.exports.createDS = (transaction, privateKey) => {
	return signTransaction(transaction, privateKey);
}

module.exports.verifyDS = (transaction, sign, publicKey) => {
	return verifyTransaction(transaction, sign, publicKey);
}

signTransaction = (transaction, privateKey) => {
	let signer = crypto.createSign('RSA-SHA256');
	signer.write(transaction);
	signer.end();
	let signature = signer.sign(privateKey, 'base64');
	return signature;
}

verifyTransaction = (transaction, signature, publicKey) => {
	let verifier = crypto.createVerify('RSA-SHA256');
	verifier.update(transaction);
	let ver = verifier.verify(publicKey, signature , 'base64');
	return ver;
}

module.exports.broadcastTransaction = (transaction, port) => {
	submitTransaction(transaction,port);
}

module.exports.broadcastBlock = (block, port) => {
	var data = fs.readFileSync(dir+"/"+port+"/addressbook.txt",{encoding:'utf8', flag:'r'});
	var address = data.toString().split("\n");
	block = replaceAll(block,'/', '%2F');
	for(let i=0;i<address.length;i++){
		var nport = address[i].substring(0,4);
		if(nport == ''){
			continue;
		}
		let url = 'http://localhost:'+nport+'/blockListener/'+block;
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try{
					var reply = JSON.parse(data).ok;
				}catch(err){
					console.log(err);
					console.log("Neighbor at Port "+nport+" is offline");
				}
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
	}
	let url = 'http://localhost:'+port+'/blockListener/'+block;
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try{
					var reply = JSON.parse(data).ok;
				}catch(err){
					console.log(err);
					console.log("Neighbor at Port "+port+" is offline");
				}
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
}

sendTransaction = (transaction, port, senderPort) => {
	transaction = replaceAll(transaction,'/', '%2F');
	transactionFile = fs.readFileSync(dir+"/"+port+"/transactions.txt",{encoding:'utf8', flag:'r'}).toString();
	if(transactionFile == ""){
		fs.writeFileSync(dir+"/"+port+"/transactions.txt", transaction);
	}
	let url = 'http://localhost:'+senderPort+'/transactionlistener/'+transaction;
	http.get(url , (res) => {
		let data = "";
		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			try{
				var reply = JSON.parse(data).ok;
			}catch(err){
				console.log("Neighbor at Port "+senderPort+" is offline");
			}
		});
	}).on('error', (err) => {
		//PORTS NOT RUNNING WILL THROW ERROR
	})
}

submitTransaction = (transaction, port) => {
	var data = fs.readFileSync(dir+"/"+port+"/addressbook.txt",{encoding:'utf8', flag:'r'});
	var address = data.toString().split("\n");
	transaction = replaceAll(transaction,'/', '%2F');
	for(let i=0;i<address.length;i++){
		var nport = address[i].substring(0,4);
		if(nport == ''){
			continue;
		}
		let url = 'http://localhost:'+nport+'/transactionlistener/'+transaction;
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				try{
					var reply = JSON.parse(data).ok;
				}catch(err){
					console.log("Neighbor at Port "+nport+" is offline");
				}
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
	}
}

module.exports.genFiles = (res, port) => {
	var pubKey = "";
	var privKey = "";
	generateKeyPair('rsa', {
		modulusLength : 530,
		publicExponent: 0x10101,
		publicKeyEncoding: {
			type: 'spki',
			format: 'pem'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'pem'
		}
	},
	(err, publicKey, privateKey) => {
		if(!err){
			pubKey = publicKey.toString('hex');
			privKey = privateKey.toString('hex');
			var content = pubKey + "\n" + privKey;
			fs.writeFileSync(dir+"/"+port+"/keys.txt",content)
			pubkeycert = pubKey.split("\n");
			privkeycert = privKey.split("\n");
			var publicKey = "";
			var privateKey = "";
			let pukstart = "-----BEGIN PUBLIC KEY-----";
			let pukend = "-----END PUBLIC KEY-----";
			let pikstart = "-----BEGIN PRIVATE KEY-----";
			let pikend = "-----END PRIVATE KEY-----";
			for(let i=0;i<pubkeycert.length;i++){
				if(pubkeycert[i]!= pukstart && pubkeycert[i]!= pukend){
					publicKey += pubkeycert[i];
				}
			}
			genLedgerFile(publicKey, privKey, pubKey, port);
			genAddressList(port,publicKey, port);
		}else{
			console.log("Crypto error");
		}
		displayHome(res, port);
	});
}

module.exports.hash = (transaction) => {
	return crypto.createHash('sha256').update(transaction).digest('hex');
}

module.exports.getPreviousBlockHash = (port) => {
	var data = fs.readFileSync(dir+"/"+port+"/ledger.txt",{encoding:'utf8', flag:'r'}).toString();
	var block = data.toString().split("#####");
	var last = block.length - 1;
	if(block[last] == ""){
		last = last -1;
	}
	var blockContents = block[last].split("\n");
	for(let i=0;i<blockContents.length;i++){
		var key = blockContents[i].split(":")[0];
		if(key == 'hash'){
			return blockContents[i].split(":")[1];
		}
	}
}

module.exports.getPreviousBlockNumber = (port) => {
	var data = fs.readFileSync(dir+"/"+port+"/ledger.txt",{encoding:'utf8', flag:'r'}).toString();
	var block = data.toString().split("#####");
	var last = block.length - 1;
	if(block[last] == ""){
		last = last -1;
	}
	return last;
}

//Proof of Work
module.exports.findNonce = (blockstring) => {
	prefix = '';
	for(let i=0;i<difficulty;i++){
		prefix += '0';
	}
	var nonce = 0;
	var hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	while(hash.substring(0,difficulty) != prefix){
		nonce =  nonce+1;
		hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	}
	return nonce; 
}

genLedgerFile = (pubKey, privKeyCert, pubKeyCert, port) => {
	prefix = '';
	for(let i=0;i<difficulty;i++){
		prefix += '0';
	}
	blockData = '100COIN0'+pubKey;
	var sign = signTransaction(blockData, privKeyCert);
	var verify = verifyTransaction(blockData, sign, pubKeyCert);
	blockData += sign;
	block = 0;
	prevHash = 0;
	timestamp = Date.now();
	markleRoot = crypto.createHash('sha256').update(blockData).digest('hex');
	var genesis = 'block:0\npreviousHash:0\ntimestamp:'+timestamp+'\nmarkleRoot:'+markleRoot;
	var blockstring = ""+ prevHash + timestamp + markleRoot;
	var nonce = 0;
	var hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	while(hash.substring(0,difficulty) != prefix){
		nonce =  nonce+1;
		hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	}
	genesis += '\nnonce:'+nonce+'\nhash:'+hash+'\n'+blockData+"\n#####";
	fs.writeFileSync(dir + "/" + port + "/ledger.txt", genesis);
	fs.writeFileSync(dir + "/" + port + "/balance.txt", "100");
	fs.writeFileSync(dir + "/" + port + "/transactions.txt", blockData+"\n");
}

genAddressList = (portNum, pubKey, port) => {
	var lastPort = 3005;
	var failed = 0;
	var nport = 3000;
	var flag = 1;
	var noOtherNode = true;
	transaction = fs.readFileSync(dir+"/"+port+"/transactions.txt",{encoding:'utf8', flag:'r'}).toString();
	pubKey = replaceAll(pubKey,'/', '%2F');
	while(flag == 1 && nport <= lastPort){
		if(nport == port){
			nport += 1;
			continue;
		}
		let url = 'http://localhost:'+nport+'/exist/'+portNum+'/'+pubKey;
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				var nodePort = JSON.parse(data).port;
				var entry = nodePort +","+JSON.parse(data).publicKey+"\n";
				fs.appendFileSync(dir+"/"+port+"/addressbook.txt", entry) 
				var ledger = JSON.parse(data).ledger;
				var currLedger = fs.readFileSync(dir+"/"+port+"/ledger.txt",{encoding:'utf8', flag:'r'}).toString();
				sendTransaction(transaction,port, nodePort);
				if(ledger.length >= currLedger.length){
					fs.writeFileSync(dir+"/"+port+"/ledger.txt",ledger);
					fs.writeFileSync(dir + "/" + port + "/balance.txt", "0");
				}
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
		nport = nport + 1;
	}
	fs.writeFileSync(dir+"/"+port+"/transactions.txt","");

}

displayHome = (res, port) => {
	res.redirect('/home')
}

escapeRegExp = (string)=> {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

replaceAll = (str, find, replace) => {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
