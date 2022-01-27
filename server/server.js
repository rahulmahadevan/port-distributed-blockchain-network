const express = require('express');
const path = require('path');
const utils = require('./utils.js');
const fs = require('fs');
const app = express();
const port = 3000;
const dir = './blockchain-network';
var pubK = "";
var privK = "";

escapeRegExp = (string)=> {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

replaceAll = (str, find, replace) => {
  return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

app.get('/',(req,res) => {
	fs.readFile(path.join(__dirname,'../view/index.html'),'utf-8', (err, html)=> {
		html = replaceAll(html,'XXXX', port);
		res.send(html);
	});	
});

//On receiving existance message from a node, add the node's address to address list and send your address to the new node
app.get('/exist/:nport/:pubKey', (req,res) => {
	var entry = req.params.nport+","+req.params.pubKey+"\n";
	fs.appendFile(dir+"/"+port+"/addressbook.txt", entry, (err) => {
		if(err) throw err;
	})
	fs.readFile(dir+"/"+port+"/keys.txt", (err, data) => {
		var keys = data.toString().split("\n");
		var publicKey = "";
		var privateKey = "";
		let pukstart = "-----BEGIN PUBLIC KEY-----";
		let pukend = "-----END PUBLIC KEY-----";
		let pikstart = "-----BEGIN PRIVATE KEY-----";
		let pikend = "-----END PRIVATE KEY-----";
		for(let i=0;i<keys.length;i++){
			if(keys[i] == pukstart){
				i++;
				while(keys[i] != pukend){
					publicKey += keys[i];
					i++;
				}
			}
		}
		for(let i=0;i<keys.length;i++){
			if(keys[i] == pikstart){
				i++;
				while(keys[i] != pikend){
					privateKey += keys[i];
					i++;
				}
			}
		}
		var exist = {
			publicKey : publicKey,
			port : port
		}
		res.send(exist);
	});
});

app.get('/transactionlistener/:transaction', (req,res) => {
	var transaction = req.params.transaction;
	var t = transaction.split("COIN");
	let pukstart = "-----BEGIN PUBLIC KEY-----\n";
	let pukend = "-----END PUBLIC KEY-----\n";
	var publicKey = pukstart + t[1].substring(0,128) +"\n"+ pukend;
	var onlyTransaction = t[0] + "COIN" + t[1].substring(0,256);
	var sign = t[1].substring(256);
	console.log("TRA: "+ onlyTransaction);
	console.log("SIGN: "+ sign);
	console.log("PUBK: "+publicKey);
	var verify = utils.verifyDS(onlyTransaction, sign, publicKey);
	if(verify){
		fs.appendFileSync(dir + "/" + port + "/transactions.txt", transaction+"\n");
		res.send({
			ok: 'OK'
		});
	}else{
		res.send({
			ok: 'NO'
		});
	}
})

app.get('/transact', (req,res) => {
	var recPubKey = req.query.publicKey.split(" ");
	var coin = req.query.coin;
	var rpk = ""
	for(let i=0;i<recPubKey.length;i++){
		rpk += recPubKey[i];
	}
	const data = fs.readFileSync(dir+"/"+port+"/keys.txt",{encoding:'utf8', flag:'r'});
	var keys = data.toString().split("\n");
	var publicKey = "";
	var privateKey = "";
	let pukstart = "-----BEGIN PUBLIC KEY-----";
	let pukend = "-----END PUBLIC KEY-----";
	let pikstart = "-----BEGIN PRIVATE KEY-----";
	let pikend = "-----END PRIVATE KEY-----";
	for(let i=0;i<keys.length;i++){
		if(keys[i] == pukstart){
			i++;
			while(keys[i] != pukend){
				publicKey += keys[i];
				i++;
			}
		}
	}
	for(let i=0;i<keys.length;i++){
		if(keys[i] == pikstart){
			i++;
			while(keys[i] != pikend){
				privateKey += keys[i];
				i++;
			}
		}
	}
	pubK = pukstart+"\n"+publicKey+"\n"+pukend+"\n";
	privK = pikstart+"\n"+privateKey+"\n"+pikend+"\n";
	transaction = coin+"COIN"+publicKey+rpk;
	var sign = utils.createDS(transaction, privK);
	var verify = utils.verifyDS(transaction, sign, pubK);
	transaction += sign;
	utils.broadcastTransaction(transaction);
	//Redirect to Transaction
});

app.get('/address', (req,res) => {
	fs.readFile(dir+"/"+port+"/addressbook.txt", (err, data) => {
		fs.readFile(path.join(__dirname,'../view/addresslist.html'),'utf-8', (err, html) => {
			fs.readFile(path.join(__dirname,'../view/addressitem.html'),'utf-8', (err, list) => {
				try{
					var address = data.toString().split("\n");
					for(let i=0;i<address.length-1;i++){
						var item = list;
						var pt = address[i].split(",")[0];
						var pk = address[i].split(",")[1];
						var pkDisplay = "";
						for(let k=0;k<pk.length;k++){
							if(k%64 == 0){
								pkDisplay += "<br>";
							}
							pkDisplay += pk.charAt(k);
						}
						item = item.replace('PKADD111', pkDisplay);
						item = item.replace('PTADD222', pt);
						html += item;	
					}
				}catch(err){
					console.log(err);
				}
				html += '</ul></div></body></html>';
				html = replaceAll(html, 'XXXX', port);
				html = html.replace('PUBKEY', pubK);
				html = html.replace('PRIKEY', privK);
				res.send(html);
			})			
		})
	})
});

app.get('/ledger', (req,res) => {
	var closeCard = '</div>';
	var closeHtml = '</div></div></body></html>';
	fs.readFile(path.join(__dirname,'../view/ledger.html'),'utf-8', (err, html)=> {
		fs.readFile(path.join(__dirname,'../view/card.html'),'utf-8', (err, card)=> {
			fs.readFile(dir+"/"+port+"/ledger.txt", (err, data) => {
				var blocks = data.toString().split("#####");
				var crr = 0;
				for(var i=0;i<blocks.length-1;i++){
					var cardLayout = card;
					blockContent = blocks[i].split("\n");
					for(let j=0+crr;j<6+crr;j++){
						cardLayout = cardLayout.replace("#$"+(j-crr)+(j-crr)+(j-crr), blockContent[j].split(":")[1]);
					}
					transactions = [];
					for(let j=6+crr;j<blockContent.length;j++){
						if(blockContent[j] != ''){
							transactions.push(blockContent[j]);
						}
					}
					var transaction = "";
					for(let i=0;i<transactions.length;i++){
						var t = transactions[i].split("COIN");
						var coins = t[0];
						var from ="";
						var to="";
						var sign = "";
						if(t[1].length < 256){
							from = "0";
							to = t[1].substring(1,129);
							sign = t[1].substring(129);
						}else{
							from = t[1].substring(0,128);
							to = t[1].substring(128,256);
							sign = t[1].substring(256);
						}
						transaction += "TRANSACTION #"+(i+1)+" - "+coins+" COINS<br>FROM: "+from+"<br>TO: "+to+"<br>SIGN: "+sign+"<br>";
					}
					cardLayout += closeCard;
					cardLayout = cardLayout.replace('#$#$',transaction);
					cardLayout = replaceAll(cardLayout,'*$*',i);
					html += cardLayout;
					crr = 1;
				}
				html += closeHtml;
				html = replaceAll(html, 'XXXX', port);
				html = html.replace('PUBKEY', pubK);
				html = html.replace('PRIKEY', privK);
				res.send(html);
			});
		});
	});
});

app.get('/home', (req,res) => {
	if(!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	//check if current host (port) folder exists
	if(!fs.existsSync(dir+"/"+port)){
		fs.mkdirSync(dir+"/"+port);
		utils.genFiles(res);
	}else{
		fs.readFile(path.join(__dirname,'../view/home.html'),'utf-8', (err, html) => {
			fs.readFile(dir+"/"+port+"/keys.txt", (err, data) => {
				var keys = data.toString().split("\n");
				var publicKey = "";
				var privateKey = "";
				let pukstart = "-----BEGIN PUBLIC KEY-----";
				let pukend = "-----END PUBLIC KEY-----";
				let pikstart = "-----BEGIN PRIVATE KEY-----";
				let pikend = "-----END PRIVATE KEY-----";
				for(let i=0;i<keys.length;i++){
					if(keys[i] == pukstart){
						i++;
						while(keys[i] != pukend){
							publicKey += keys[i];
							i++;
						}
					}
				}
				for(let i=0;i<keys.length;i++){
					if(keys[i] == pikstart){
						i++;
						while(keys[i] != pikend){
							privateKey += keys[i];
							i++;
						}
					}
				}
				pubK = pukstart+"\n"+publicKey+"\n"+pukend+"\n";
				privK = pikstart+"\n"+privateKey+"\n"+pikend+"\n";
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
				pubK = pubKeyDisplay;
				privK = privKeyDisplay;
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
});


app.listen(port, () => {
	console.log("Blockchain server started");
	console.log("\nGoto http://localhost:"+port);
});