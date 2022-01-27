const fs = require('fs');
const { generateKeyPair } = require('crypto');
const crypto = require('crypto');
const http = require('http');
const dir = './blockchain-network';
const path = require('path');
const port = 3000;
const difficulty = 2;

module.exports.createDS = (transaction, publicKey, privateKey) => {
	
}

module.exports.genFiles = (res) => {
	var pubKey = "";
	var privKey = "";
	generateKeyPair('ec', {
		namedCurve: 'secp256k1',
		publicKeyEncoding: {
			type: 'spki',
			format: 'der'
		},
		privateKeyEncoding: {
			type: 'pkcs8',
			format: 'der'
		}
	},
	(err, publicKey, privateKey) => {
		if(!err){
			pubKey = publicKey.toString('hex');
			privKey = privateKey.toString('hex')
			var content = pubKey + "\n" + privKey;
			fs.writeFile(dir+"/"+port+"/keys.txt",content, (err,file) =>{
				if(err) throw err;
				console.log("Key.txt created");
			});
			genAddressList(port,pubKey);
			genLedgerFile(pubKey);
		}else{
			console.log("Crypto error");
		}
		displayHome(res);
		return Promise.resolve([pubKey,privKey]);
	});
}

genLedgerFile = (pubKey) => {
	prefix = '';
	for(let i=0;i<difficulty;i++){
		prefix += '0';
	}
	blockData = '100COIN0TO'+pubKey;
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
	console.log("Nonce:"+ nonce);
	genesis += '\nnonce:'+nonce+'\nhash:'+hash+'\n'+blockData+"\n#####";
	fs.writeFile(dir + "/" + port + "/ledger.txt", genesis, (err,file) => {
		if(err) throw err;
		console.log("ledger.txt created");
	});
}

genAddressList = (portNum, pubKey) => {
	var nport = port;
	var flag = 1;
	while(flag == 1 && nport <3050){
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
	fs.readFile(path.join(__dirname,'../view/home.html'),'utf-8', (err, html) => {
		fs.readFile(dir+"/"+port+"/keys.txt", (err, data) => {
			var keys = data.toString().split("\n");
			var publicKey = keys[0];
			var privateKey = keys[1];
			var privKeyDisplay = "";
			var pubKeyDisplay = "";
			var c = 0;
			for(let i=0;i<privateKey.length;i++){
				if(i%16==0){
					privKeyDisplay = privKeyDisplay + "\n";
				}
				privKeyDisplay = privKeyDisplay + privateKey.charAt(i);
			}
			for(let i=0;i<publicKey.length;i++){
				if(i%16==0){
					pubKeyDisplay = pubKeyDisplay + "\n";
				}
				pubKeyDisplay = pubKeyDisplay + publicKey.charAt(i);
			}
			html = replaceAll(html, 'XXXX', port);
			html = html.replace('PUBKEY', pubKeyDisplay);
			html = html.replace('PRIKEY', privKeyDisplay);
		});
		fs.readFile(dir+"/"+port+"/ledger.txt", (err, data) => {
			var blocks = data.toString().split("#####");
			blockContent = blocks[0].split("\n");
			transactions = blockContent[6];
			t = transactions.split("COIN");
			coins = t[0];
			from = t[1].split("TO")[0];
			to = t[1].split("TO")[1];
			html = replaceAll(html, '$$$', coins);
			res.send(html);
		})
	});
}