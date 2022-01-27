const fs = require('fs');
const { generateKeyPair } = require('crypto');
const crypto = require('crypto');
const http = require('http');
const dir = './blockchain-network';
const path = require('path');
const port = 3000;
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

module.exports.broadcastTransaction = (transaction) => {
	var data = fs.readFileSync(dir+"/"+port+"/addressbook.txt",{encoding:'utf8', flag:'r'});
	var address = data.toString().split("\n");
	transaction = replaceAll(transaction,'/', '%2F');
	for(let i=0;i<address.length;i++){
		var nport = address[i].substring(0,4);
		if(nport == ''){
			continue;
		}
		let url = 'http://localhost:'+nport+'/transactionlistener/'+transaction;
		console.log("URL: "+url);
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				var reply = JSON.parse(data).ok;
				console.log(reply);
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
	}
}

module.exports.genFiles = (res) => {

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
			fs.writeFile(dir+"/"+port+"/keys.txt",content, (err,file) =>{
				if(err) throw err;
			});
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
			genAddressList(port,publicKey);
			genLedgerFile(publicKey, privKey, pubKey);
		}else{
			console.log("Crypto error");
		}
		displayHome(res);
		return Promise.resolve([pubKey,privKey]);
	});
}

genLedgerFile = (pubKey, privKeyCert, pubKeyCert) => {
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
	markleRoot = crypto.createHash('sha256').update(blockData).digest('hex');;
	var genesis = 'block:0\npreviousHash:0\ntimestamp:'+timestamp+'\nmarkleRoot:'+markleRoot;
	var blockstring = ""+block + prevHash + timestamp + markleRoot;
	var nonce = 0;
	var hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	while(hash.substring(0,difficulty) != prefix){
		nonce =  nonce+1;
		hash = crypto.createHash('sha256').update(blockstring+nonce).digest('hex');
	}
	genesis += '\nnonce:'+nonce+'\nhash:'+hash+'\n'+blockData+"\n#####";
	fs.writeFile(dir + "/" + port + "/ledger.txt", genesis, (err,file) => {
		if(err) throw err;
	});
	fs.writeFileSync(dir + "/" + port + "/transactions.txt", blockData+"\n");
}

genAddressList = (portNum, pubKey) => {
	var nport = port + 1;
	var flag = 1;
	pubKey = replaceAll(pubKey,'/', '%2F');
	while(flag == 1 && nport <3002){
		let url = 'http://localhost:'+nport+'/exist/'+portNum+'/'+pubKey;
		http.get(url , (res) => {
			let data = "";
			res.on('data', (chunk) => {
				data += chunk;
			});

			res.on('end', () => {
				var entry = JSON.parse(data).port+","+JSON.parse(data).publicKey+"\n";
				fs.appendFile(dir+"/"+port+"/addressbook.txt", entry, (err) => {
					if(err) throw err;
				})
			});
		}).on('error', (err) => {
			//PORTS NOT RUNNING WILL THROW ERROR
		})
		nport = nport + 1;
	}
}

displayHome = (res) => {
	res.redirect('/home')
}

escapeRegExp = (string)=> {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

replaceAll = (str, find, replace) => {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}
