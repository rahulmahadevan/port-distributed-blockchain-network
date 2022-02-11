const express = require('express');
const path = require('path');
const utils = require('./utils.js');
const fs = require('fs');
const app = express();
const dir = './blockchain-network';
var pubK = "";
var privK = "";
const args = process.argv.slice(2);
const port = args[0];

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
		var ledger = fs.readFileSync(dir+"/"+port+"/ledger.txt",{encoding:'utf8', flag:'r'});
		
		var exist = {
			publicKey : publicKey,
			port : port,
			ledger : ledger.toString()
		}
		res.send(exist);
	});
});

app.get('/transactionview/:loc', (req,res) => {
	var loc = req.params.loc;
	var transactionhtml = '<h1 class="display-4">Transaction List</h1><h3>Shows the transaction received from the network</h3><ul class="list-group"><li class="list-group-item d-flex justify-content-between align-items-center list-group-item-primary"><span class="badge badge-primary badge-pill">SNo.</span>Transaction</li>';
	var transactionitem = '<li class="list-group-item d-flex justify-content-between align-items-center" ><span class="badge badge-primary badge-pill">SNUM</span>TRANSACTION</li>'
	var successtransaction = '<li class="list-group-item d-flex justify-content-between align-items-center list-group-item-success" ><span class="badge badge-primary badge-pill">SNUM</span>TRANSACTION</li>'
	fs.readFile(dir+"/"+port+"/transactions.txt", (err, data) => {
		fs.readFile(path.join(__dirname,'../view/page.html'),'utf-8', (err, html) => {
			try{
				var t = data.toString().split("\n");
				var list = [];
				html += transactionhtml;
				var index = 0;
				for(let i=0;i<t.length;i++){
					if(t[i] == ''){
						continue;
					}
					list.push(t[i]);
				}
				successIndex = list.length-1;
				var item = "";
				for(let i=0;i<t.length;i++){
					if(t[i] == ''){
						continue;
					}
					if(i == successIndex && loc == 1){
						item = successtransaction;

					}else{
						item = transactionitem;
					}
					var tdisplay = ""
					for(let j=0;j<t[i].length;j++){
						if(j%92==0){
							tdisplay += "<br>";
						}
						tdisplay += t[i].charAt(j);
					}
					item = item.replace("TRANSACTION", tdisplay);
					item = item.replace("SNUM", (index+1));
					index += 1;
					html += item;
				}
				html += '</ul></div></body></html>';
				html = replaceAll(html, 'XXXX', port);
				html = html.replace('PUBKEY', pubK);
				html = html.replace('PRIKEY', privK);
				res.send(html);
			}catch(err){
				console.log(err);
			}
		});
	});
});

app.get('/transactionlistener/:transaction', (req,res) => {
	var transaction = req.params.transaction;
	console.log("\n"+transaction);
	var t = transaction.split("COIN");
	let pukstart = "-----BEGIN PUBLIC KEY-----\n";
	let pukend = "-----END PUBLIC KEY-----\n";
	var publicKey = "";
	var onlyTransaction = "";
	if(t[1].length < 256){
		from = "0";
		publicKey = pukstart + t[1].substring(1,129) +"\n"+ pukend;
		sign = t[1].substring(129);
		onlyTransaction = t[0] + "COIN" + from + t[1].substring(1,129);
	}else{
		publicKey = pukstart + t[1].substring(0,128) +"\n"+ pukend;
		onlyTransaction = t[0] + "COIN" + t[1].substring(0,256);
		sign = t[1].substring(256);
	}
	var verify = utils.verifyDS(onlyTransaction, sign, publicKey);
	if(verify){
		fs.appendFileSync(dir + "/" + port + "/transactions.txt", transaction+"\n");
		res.redirect('/ledger');
	}else{
		res.send({
			ok: 'NO'
		});
	}
})

app.get('/transact', (req,res) => {
	var recPubKey = req.query.publicKey.split(" ");
	var coin = req.query.coin;
	balance = Number(fs.readFileSync(dir+"/"+port+"/balance.txt",{encoding:'utf8', flag:'r'}).toString());
	balance = balance - Number(coin);
	fs.writeFileSync(dir + "/" + port + "/balance.txt", balance);
	var rpk = "";
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
	fs.appendFileSync(dir+"/"+port+"/transactions.txt", transaction);
	utils.broadcastTransaction(transaction, port);
	//Redirect to Transaction
	res.redirect('/transactionview/1');
});

app.get('/mining', (req,res) => {
	var miningHtml = '<h1 class="display-4">Mine a Block</h1><h3>Select at least 1 transaction to add to the new block</h3><form action="http://localhost:XXXX/startmining" method="get"><ul class="list-group">';
	var checkbox = '<li class="list-group-item"><input class="form-check-input me-1" type="checkbox" name="TNO" value="TRANSACTIONVAL" aria-label="...">TRANSACTIONVIEW</li>'
	var heading = '<li class="list-group-item d-flex justify-content-between align-items-center list-group-item-primary"><span class="badge badge-primary badge-pill">Select</span>Transaction</li>'
	var submitButton = '<button type="submit" class="btn btn-warning w-25">Start Mining</button>'
	fs.readFile(dir+"/"+port+"/transactions.txt", (err, data) => {	
		fs.readFile(path.join(__dirname,'../view/page.html'),'utf-8', (err, html) =>{
			try{
				html += miningHtml;
				html += heading;
				var t = data.toString().split("\n");
				for(let i=0;i<t.length;i++){
					if(t[i] == ''){
						continue;
					}
					var item = checkbox;
					var tdisplay = ""
					for(let j=0;j<t[i].length;j++){
						if(j%92==0){
							tdisplay += "<br>";
						}
						tdisplay += t[i].charAt(j);
					}
					item = item.replace("TNO", (i+1));
					item = item.replace("TRANSACTIONVAL", t[i]);
					item = replaceAll(item, "TRANSACTIONVIEW", tdisplay);
					html += item;
				}
			}catch(err){
				console.log(err);
			}
			
			html += submitButton;
			html += '</ul></form></div></body></html>';
			html = replaceAll(html, 'XXXX', port);
			res.send(html);
		});
	});
});

app.get('/blockListener/:block', (req,res) => {
	var block = req.params.block;
	var blockContent = block.split("\n");
	keys = fs.readFileSync(dir+"/"+port+"/keys.txt",{encoding:'utf8', flag:'r'}).toString().split("\n");
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
	var calMarkleRoot = "";
	var prevHash = "";
	var markleRoot = "";
	var hash = "";
	var nonce = "";
	var timestamp = "";
	for(let i=0;i<6;i++){
		var key = blockContent[i].split(":")[0];
		if(key == 'previousHash'){
			prevHash = blockContent[i].split(":")[1];
		}else if(key == "timestamp"){
			timestamp = blockContent[i].split(":")[1];
		}else if(key == "markleRoot"){
			markleRoot = blockContent[i].split(":")[1];
		}else if(key == "nonce"){
			nonce = blockContent[i].split(":")[1];
		}else if(key == "hash"){
			hash = blockContent[i].split(":")[1];
		}
	}
	transactionsList = fs.readFileSync(dir+"/"+port+"/transactions.txt",{encoding:'utf8', flag:'r'}).toString().split("\n");
	newtransactionsList = [];
	for(let i=6; i<blockContent.length;i++){
		if(blockContent[i]!="#####"){
			calMarkleRoot += blockContent[i];
			console.log(blockContent[i]);
			try{
				var t = blockContent[i].split("COIN");
				newtransactionsList.push(blockContent[i]);
				coin = t[0];
				var to, from, sign;
				if(t[1].length < 256){
					from = "0";
					to = t[1].substring(1,129);
					sign = t[1].substring(129);
				}else{
					from = t[1].substring(0,128);
					to = t[1].substring(128,256);
					sign = t[1].substring(256);
				}
				if(to == publicKey){
					var balance = Number(fs.readFileSync(dir+"/"+port+"/balance.txt",{encoding:'utf8', flag:'r'}).toString());
					balance = balance + Number(coin);
					fs.writeFileSync(dir + "/" + port + "/balance.txt", balance);
				}
			}catch(err){

			}
		}
	}
	updatedtransaction = transactionsList.filter(x => !newtransactionsList.includes(x));
	transactionstring = "";
	for(let i=0;i<updatedtransaction.length;i++){
		transactionstring += updatedtransaction[i];
		if(i != updatedtransaction.length-1){
			transactionstring += "\n";
		}
	}
	fs.writeFileSync(dir + "/" + port + "/transactions.txt", transactionstring);
	calMarkleRoot = utils.hash(calMarkleRoot);
	if(calMarkleRoot == markleRoot){
		var blockstring = ""+prevHash+timestamp+markleRoot+nonce;
		var calHash = utils.hash(blockstring);
		if(calHash == hash){
			console.log("BLOCK VERIFIED");
			fs.appendFileSync(dir + "/" + port + "/ledger.txt", "\n"+block+"#####");
			res.send({
				ok : 'OK'
			});
		}else{
			console.log("MALICIOUS BLOCK CONTENTS");
			res.send({
				ok : 'NO'
			});
		}
	}else{
		console.log("MALICIOUS TRANSACTIONS");
		res.send({
			ok : 'NO'
		});
	}
});

app.get('/startmining', (req,res) =>{
	var timestamp = Date.now();
	var transactions = req.query;
	const keys = Object.keys(transactions);
	var markleRoot = "";
	var transactionList = "";
	for(let i=0;i<keys.length;i++){
		transactionList += "\n" + transactions[keys[i]];
		var t = replaceAll(transactions[keys[i]], '%2F','/')
		markleRoot += t;
	}
	markleRoot = utils.hash(markleRoot);
	var blockNum = utils.getPreviousBlockNumber(port);
	var prevHash = utils.getPreviousBlockHash(port);
	var blockstring = ""+ prevHash + timestamp + markleRoot;
	var nonce = utils.findNonce(blockstring);
	var hash = utils.hash(blockstring+nonce);
	var newBlock = "block:"+(blockNum+1)+"\npreviousHash:"+prevHash+"\ntimestamp:"+timestamp+"\nmarkleRoot:"+markleRoot+"\nnonce:"+nonce+"\nhash:"+hash+transactionList+"\n#####";
	utils.broadcastBlock(newBlock, port);
	res.redirect('/ledger');
});

app.get('/address', (req,res) => {
	var addresshtml = '<h1 class="display-4">Address Book</h1><ul class="list-group"><li class="list-group-item d-flex justify-content-between align-items-center list-group-item-primary">Public Key Address<span class="badge badge-primary badge-pill">Port Address</span></li>';
	var list = '<li class="list-group-item d-flex justify-content-between align-items-center" >PKADD111<span class="badge badge-primary badge-pill">PTADD222</span></li>'
	fs.readFile(dir+"/"+port+"/addressbook.txt", (err, data) => {
		fs.readFile(path.join(__dirname,'../view/page.html'),'utf-8', (err, html) => {
			try{
				html += addresshtml;
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
				console.log("No nodes in the network");
			}
			html += '</ul></div></body></html>';
			html = replaceAll(html, 'XXXX', port);
			html = html.replace('PUBKEY', pubK);
			html = html.replace('PRIKEY', privK);
			res.send(html);
		});
	});
});

app.get('/ledger', (req,res) => {
	var ledgerHtml = '<h1 class="display-4">Ledger</h1><div class="card-group">'
	var closeCard = '</div>';
	var closeHtml = '</div></div></body></html>';
	var card = '<div class="card"><div class="card-header">Block #$000</div><div class="card-body"><h5 class="card-title">Block Hash: #$555</h5><h6 class="card-title">Previous Block Hash: #$111</h5><h6 class="card-title">Timestamp: #$222</h5><h6 class="card-title">Markle Root: #$333</h5><h6 class="card-title">Nonce: #$444</h5><a href="#" class="btn btn-primary" data-toggle="collapse" data-target="#collapse*$*" aria-expanded="false" aria-controls="collapse*$*">View Transactions</a><div class="collapse" id="collapse*$*"><div class="card card-body">#$#$</div></div></div>';
	fs.readFile(path.join(__dirname,'../view/page.html'),'utf-8', (err, html)=> {
		fs.readFile(dir+"/"+port+"/ledger.txt", (err, data) => {
			html += ledgerHtml;
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

app.get('/home', (req,res) => {
	if(!fs.existsSync(dir)){
		fs.mkdirSync(dir);
	}
	//check if current host (port) folder exists
	if(!fs.existsSync(dir+"/"+port)){
		fs.mkdirSync(dir+"/"+port);
		utils.genFiles(res, port);
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
				balance = Number(fs.readFileSync(dir+"/"+port+"/balance.txt",{encoding:'utf8', flag:'r'}).toString());
				html = replaceAll(html, '$$$', balance);
				res.send(html);
			})
		});
	}
});


app.listen(port, () => {
	console.log("Blockchain server started");
	console.log("\nGoto http://localhost:"+port);
});