const sha256 = require('sha256')
const randomBytes = require('randombytes');
const crypto = require("crypto");
const eccrypto = require("eccrypto");


const maxFees = 5000
var accounts = generateAccounts(100)
var nodes = generateNodes(50, accounts)

function transactionFlood() {
  generateTransactions(1000, nodes)
}

setInterval(transactionFlood, 500)
setInterval(voteTransactions, 500)
setInterval(stats, 1000)


function stats() {
  console.log("=================================================================")
  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n]
    console.log("Node ID: "+node.hash)
    console.log("Total Time: "+node.totalTime)
    console.log("Total Transactions: "+node.totalTransactions)
    console.log("Pending Transactions: "+node.txPool.length)
    console.log("TPS: "+node.totalTransactions*60*100/node.totalTime)
    console.log("Data bloat:"+memorySizeOf(node))
  }
}

function generateNodes(total, accounts) {
  var nodes = []
  for (var i = 0; i < total; i++) {
    var node = {
      id: i,
      hash: sha256(""+i),
      stake: getRandomInt(1000),
      accounts: accounts,
      txPool: [],
      finalizedTransactions: [],
      totalTransactions: 0,
      totalTime: 0,
      startTime: new Date().getTime()
    }
    nodes.push(node)
  }
  return nodes
}

function generateAccounts(total) {
  var accounts = []
  for (var i = 0; i < total; i++) {
    const privateKey = crypto.randomBytes(32)
    const publicKey = eccrypto.getPublic(privateKey)
    var account = {
      // A new random 32-byte private key.
      privateKey: privateKey,
      // Corresponding uncompressed (65-byte) public key.
      publicKey: publicKey,
      public: publicKey.toString('hex'),
      balance: 1000
    }
    accounts.push(account)
  }
  return accounts
}

function generateTransactions(total, nodes) {
  for (var i = 0; i < total; i++) {
    var node = nodes[getRandomInt(nodes.length)]
    var from = node.accounts[getRandomInt(accounts.length)]
    var to = node.accounts[getRandomInt(accounts.length)]
    generateTransaction(from, to, node)
  }
}

function generateTransaction(from, to, node) {
  var transaction = {
    from: from.public,
    to: to.public,
    value: getRandomInt(from.balance),
    timestamp: new Date().getTime()
  }
  var msg = crypto.createHash("sha256").update(JSON.stringify(transaction)).digest();
  eccrypto.sign(from.privateKey, msg).then(function(sig) {
    transaction.sig = sig.toString('hex')
    transaction.hash = crypto.createHash("sha256").update(JSON.stringify(transaction)).digest().toString('hex');
    node.txPool.push(transaction)
  });
}

function voteTransactions() {
  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n]
    while (node.txPool.length > 0) {
      var transaction = node.txPool.shift()
      if (!voteTransaction(transaction)) {
        node.txPool.push(transaction)
      }
    }
  }
}

function voteTransaction(transaction) {
  var stake = 0
  var totalStake = 0
  var k = getRandomInt(nodes.length)
  for (var n = 0; n < k; n++) {
    var node = nodes[getRandomInt(nodes.length)]
    totalStake += node.stake
    stake += node.stake
  }
  if (stake > (totalStake / 3 * 2)) {
    propagateTransaction(transaction)
    return true
  } else {
    return false
  }
}

function propagateTransaction(transaction) {
  for (var n = 0; n < nodes.length; n++) {
    var node = nodes[n]
    node.totalTransactions++
    node.totalTime = new Date().getTime() - node.startTime
    node.finalizedTransactions.push(transaction)
  }
}


function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}
function memorySizeOf(obj) {
    var bytes = 0;

    function sizeOf(obj) {
        if(obj !== null && obj !== undefined) {
            switch(typeof obj) {
            case 'number':
                bytes += 8;
                break;
            case 'string':
                bytes += obj.length * 2;
                break;
            case 'boolean':
                bytes += 4;
                break;
            case 'object':
                var objClass = Object.prototype.toString.call(obj).slice(8, -1);
                if(objClass === 'Object' || objClass === 'Array') {
                    for(var key in obj) {
                        if(!obj.hasOwnProperty(key)) continue;
                        sizeOf(obj[key]);
                    }
                } else bytes += obj.toString().length * 2;
                break;
            }
        }
        return bytes;
    };

    function formatByteSize(bytes) {
        if(bytes < 1024) return bytes + " bytes";
        else if(bytes < 1048576) return(bytes / 1024).toFixed(3) + " KiB";
        else if(bytes < 1073741824) return(bytes / 1048576).toFixed(3) + " MiB";
        else return(bytes / 1073741824).toFixed(3) + " GiB";
    };

    return formatByteSize(sizeOf(obj));
};
