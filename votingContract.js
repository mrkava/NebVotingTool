// Voting system on Nebulas blockchain

var VotingContract = function() {
  // Data stored by the smart contract
  LocalContractStorage.defineMapProperty(this, "voted_user_list"); // Max, Number, Data, Date
  LocalContractStorage.defineMapProperty(this, "poll_results");
  LocalContractStorage.defineProperty(this, "voted_users_count");
  LocalContractStorage.defineProperty(this, "poll_variants");
  LocalContractStorage.defineProperty(this, "poll_name");
  LocalContractStorage.defineProperty(this, "voting_price");
}

VotingContract.prototype = {
  // init is called once, when the contract is deployed.
  init: function(defined_name, defined_poll_variants, defined_voting_price) { 
	this.voted_users_count = new BigNumber(0);
	if (defined_poll_variants && defined_poll_variants.length) {
		this.poll_variants = defined_poll_variants;
	} else {
		throw new Error("Poll variants array not provided");
	}
	defined_name = String(defined_name);
	defined_name = defined_name.length > 50 ? defined_name.substr(0,49) : defined_name;
	this.poll_name = defined_name;
	defined_voting_price = parseFloat(String(defined_voting_price));
	if (defined_voting_price) {
		this.voting_price = new BigNumber(defined_voting_price);
	}
  },

  vote: function(chosenValue) {
    if(Blockchain.transaction.value < this.voting_price) { 
        throw new Error("You must pay to submit your vote. Voting price is " + this.voting_price);
    }
	if (this.poll_variants.indexOf(chosenValue) === -1) {
		throw new Error("Not valid poll variant: " + chosenValue);
	}
	var voter = this.voted_user_list.get(Blockchain.transaction.from);
	if (voter) {
		throw new Error("This address already voted.");
	}
	var number_of_votes = this.poll_results.get(chosenValue) || new BigNumber(0);
    this.voted_user_list.put(Blockchain.transaction.from, chosenValue);
	this.poll_results.put(chosenValue, number_of_votes.plus(1));
	this.voted_users_count = this.voted_users_count.plus(1);
  },

  requestPollResults: function() {
	var poll_res = [];
	var that = this;
	this.poll_variants.forEach(function(variant) {
		var res = {};
		res[variant] = that.poll_results.get(variant) || 0;
		poll_res.push(res);
	})
    return poll_res;
  },
  
  requestVotedUsersCount: function() {
    return this.voted_users_count;
  },
  
  requestPollVariants: function() {
    return this.poll_variants;
  },

  requestPollName: function() {
    return this.poll_name;
  }, 	
  
  checkIfAddressVoted: function(addr) {
	return this.voted_user_list.get(addr);
  }
}

module.exports = VotingContract;
