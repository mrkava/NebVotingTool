// Voting system on Nebulas blockchain

var Poll = function(data) {
		this.votedUsersCount = new BigNumber(0);
		this.votedAdressesList = [];
		this.id = data.id;
		this.pollVariants = data.pollVariants;
		this.pollResults = {};
		var that = this;
		data.pollVariants.forEach(function(variant) {
			that.pollResults[variant] = 0;
		});
		this.pollName = data.name;
		this.pollCreator = data.creatorAddress;
		this.votingPrice = data.price;
		this.maxVotersNumber = data.maxVotersNumber;
}

Poll.prototype = {
    toString: function() {
        return JSON.stringify(this);
    }
};

var VotingContract = function() {
  LocalContractStorage.defineMapProperty(this, "polls");
  LocalContractStorage.defineProperty(this, "polls_number");
}

VotingContract.prototype = {
  init: function() {
	  this.polls_number = new BigNumber(0);
  },
  
  createPoll: function(name, variants, price, maxVoters) {
	var poll_data = {};
	
	if (variants && variants.length && Array.isArray(variants)) {
		poll_data.pollVariants = variants;
	} else {
		throw new Error("Poll variants array not provided");
	}
	
	if (name) {
		var defined_name = String(name);
		defined_name = defined_name.length > 50 ? defined_name.substr(0,49) : defined_name;
		poll_data.name = defined_name;
	} else {
		throw new Error("Poll name not provided");
	}
	
	if (price) {
		var defined_voting_price = parseFloat(String(price));
		poll_data.price = new BigNumber(defined_voting_price);
	} else {
		throw new Error("Poll voting price not provided");
	}
	
	if (maxVoters) {
		var defined_max_voters = parseInt(String(maxVoters));
		poll_data.maxVotersNumber = new BigNumber(defined_max_voters);
	} else {
		throw new Error("Poll voting price not provided");
	}
	poll_data.creatorAddress = Blockchain.transaction.from;
	poll_data.id = Blockchain.transaction.from + 'poll' + this.polls_number;
	var newPoll = new Poll(poll_data);
	this.polls.put(poll_data.id, newPoll);
	this.polls_number = new BigNumber(this.polls_number).plus(1);
	return poll_data.id;
  },

  requestPoll: function(pollId) {
	  return this.polls.get(pollId);
  }
}

module.exports = VotingContract;