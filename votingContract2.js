// Voting system on Nebulas blockchain

var Poll = function(data) {
	this.votedUsersCount = new BigNumber(0);
	this.votersPayments = new BigNumber(0);
	this.wasWithdrawalProceeded = false;
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
    this.endDate = data.endDate;
    this.endDateTimestamp = data.endDateTimestamp;
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
  
  createPoll: function(name, variants, price, maxVoters, endDate) {
	if (!Blockchain.transaction.value.eq(0)) { 
        throw new Error("Creating poll is free! Set transaction value to 0!");
    }  
	var poll_data = {};
	
	if (variants && variants.length && Array.isArray(variants)) {
		if (variants.length < 31) {
			poll_data.pollVariants = variants;
		} else {
			throw new Error("Maximum 30 poll variants is allowed.");
		}
	} else {
		throw new Error("Poll variants array not provided.");
	}
	
	if (name) {
		var defined_name = String(name);
		defined_name = defined_name.length > 50 ? defined_name.substr(0,49) : defined_name;
		poll_data.name = defined_name;
	} else {
		throw new Error("Poll name not provided.");
	}
	
	if (price !== undefined) {
		var defined_voting_price = parseFloat(String(price));
        defined_voting_price = defined_voting_price >= 0 ? defined_voting_price : 0;
		poll_data.price = new BigNumber(defined_voting_price);
	} else {
		throw new Error("Poll voting price not provided.");
	}
	
	if (maxVoters) {
		var defined_max_voters = parseInt(String(maxVoters));
		poll_data.maxVotersNumber = new BigNumber(defined_max_voters);
	} else {
		throw new Error("Max numbers of voters not provided.");
	}

	if (endDate) {
		var date_string = new Date(endDate);
		if (!isNaN(date_string)) {
            var now = Date.now();
            var d_utc = Date.UTC(date_string.getUTCFullYear(), date_string.getUTCMonth(), date_string.getUTCDate(), 23, 59, 59);

            if (now > d_utc) {
                throw new Error("End date must be in future.");
			} else {
                poll_data.endDate = date_string;
                poll_data.endDateTimestamp = d_utc;
			}
		} else {
          	throw new Error("End date is not valid.");
		}
	} else {
        throw new Error("End date not provided.");
    }

	poll_data.creatorAddress = Blockchain.transaction.from;
	poll_data.id = Blockchain.transaction.from + 'poll' + this.polls_number;
	var newPoll = new Poll(poll_data);
	this.polls.put(poll_data.id, newPoll);
	this.polls_number = new BigNumber(this.polls_number).plus(1);
	return poll_data.id;
  },

  requestPoll: function(pollId) {
	  var poll_response = {};
	  var poll = this.polls.get(pollId);
	  if (poll) {
		  poll_response.poll = poll;
		  poll_response.isPollEndDateActive = new BigNumber(poll.endDateTimestamp).gt(new BigNumber(Date.now()));
		  poll_response.maxVotersLimit = new BigNumber(poll.maxVotersNumber).gt(new BigNumber(poll.votedUsersCount));
		  return poll_response; 
	  } else {
		  throw new Error("Poll ID is not correct.");
	  }
  },

  vote: function(pollId, voteVariant) {
	  var poll = this.polls.get(pollId);
	  if (poll) {
	  	if (poll.votedAdressesList.indexOf(Blockchain.transaction.from) !== -1) {
            throw new Error("The address already voted in this poll.");
		}

		if (!(new BigNumber(poll.maxVotersNumber).gt(new BigNumber(poll.votedUsersCount)))) {
            throw new Error("Sorry, no more votes are accepted in this poll.");
		}
		
		var nas_transaction_value = new BigNumber(Blockchain.transaction.value).div(new BigNumber(10).pow(18));

		if (nas_transaction_value.lt(new BigNumber(poll.votingPrice))) {
		    throw new Error("You must pay small fee to submit your vote. Voting price for this poll is " + poll.votingPrice + " NAS");
		}
		
		if(new BigNumber(poll.endDateTimestamp).lt(new BigNumber(Date.now()))) {
			throw new Error("Sorry, no more votes are accepted in this poll.");
		}

	  	if (poll.pollResults[voteVariant] !== undefined) {
            poll.pollResults[voteVariant] = new BigNumber(poll.pollResults[voteVariant]).plus(1);
            poll.votedAdressesList.push(Blockchain.transaction.from);
            poll.votedUsersCount = new BigNumber(poll.votedUsersCount).plus(1);
			poll.votersPayments = new BigNumber(poll.votersPayments).plus(Blockchain.transaction.value);
            this.polls.put(poll.id, poll);
		} else {
            throw new Error("Voting variant is not valid.");
		}
		return poll;
	  } else {
          throw new Error("Poll ID is not correct.");
	  }
  },
  withdraw: function(pollId) {
	if (!Blockchain.transaction.value.eq(0)) { 
        throw new Error("Withdrawal is free! Set transaction value to 0!");
    }  
	 var poll = this.polls.get(pollId);
	 
	 if (!poll) {
		throw new Error("Poll ID is not correct.");
	 }
	
     if (Blockchain.transaction.from !== poll.pollCreator) {
		throw new Error("Only poll creator could withdraw funds."); 
	 }
	 
	 if (poll.wasWithdrawalProceeded) {
		throw new Error("Withdrawal from this poll has been proceeded already.");
	 }
	 
	 if (new BigNumber(poll.endDateTimestamp).lt(new BigNumber(Date.now())) || new BigNumber(poll.maxVotersNumber).eq(new BigNumber(poll.votedUsersCount))){
       var transferResult = Blockchain.transfer(poll.pollCreator, new BigNumber(poll.votersPayments));
       if (!transferResult) {
         throw new Error("Unable to process withdrawal, please try again later.");
       } else {
		  poll.wasWithdrawalProceeded = true;
		  this.polls.put(poll.id, poll);
		  return [transferResult, poll.pollCreator, new BigNumber(poll.votersPayments)];
       }
     } else {
         throw new Error("Poll is not completed, withdrawal is not available.");  
       }
  }
}

module.exports = VotingContract;
