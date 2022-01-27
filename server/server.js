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
	console.log("Entry : "+ entry);
	fs.appendFile(dir+"/"+port+"/addressbook.txt", entry, (err) => {
		if(err) throw err;
		console.log("Saved!");
	})
	fs.readFile(dir+"/"+port+"/keys.txt", (err, data) => {
		var keys = data.toString().split("\n");
		var publicKey = keys[0];
		var exist = {
			publicKey : publicKey,
			port : port
		}
		res.send(exist);
	});
});

app.get('/transact', (req,res) => {
	var recPubKey = req.query.publicKey.replace('/\s+/g', ' ').trim().split(" ");
	var coin = req.query.coin;
	var rpk = ""
	for(let i=0;i<recPubKey.length;i++){
		rpk += recPubKey[i];
	}
	pubK = pubK.replace('/\s+/g', ' ').trim().split("\n")
	privK = privK.replace('/\s+/g', ' ').trim().split("\n");
	pub = "";
	for(let i=0;i<pubK.length;i++){
		pub += pubK[i];
	}
	priv = "";
	for(let i=0;i<privK.length;i++){
		priv += privK[i];
	}
	transaction = coin+"COIN"+pub+"TO"+rpk;
	var sign = utils.createDS(transaction, pub, priv);
	console.log(transaction);
	res.send(req.query);
})

app.get('/address', (req,res) => {
	fs.readFile(dir+"/"+port+"/addressbook.txt", (err, data) => {
		fs.readFile(path.join(__dirname,'../view/addresslist.html'),'utf-8', (err, html) => {
			fs.readFile(path.join(__dirname,'../view/addressitem.html'),'utf-8', (err, list) => {
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
						var from = t[1].split("TO")[0];
						var to = t[1].split("TO")[1];
						transaction += "TRANSACTION #"+(i+1)+" - "+coins+" COINS<br>FROM: "+from+"<br>TO: "+to+"<br>";
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
		console.log("NODE FILE DOES NOT EXIST");
		console.log("Joined successfully");
	}else{
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