class AgeVerificationService {
	constructor() {
		this.verifications = new Map();
	}

	async verifyAge(userId, age) {
		// Mock implementation - in real app this would call external service
		if (age >= 18) {
			this.verifications.set(userId, { verified: true, age });
			return { verified: true, age };
		}
		return { verified: false, age: null };
	}

	async getVerificationStatus(userId) {
		return this.verifications.get(userId) || { verified: false, age: null };
	}

	async checkAccess(userId, contentRating) {
		const status = await this.getVerificationStatus(userId);

		if (!status.verified) {
			return false;
		}

		// Simple content rating check
		const age = status.age;
		switch (contentRating) {
			case "G":
			case "PG":
				return true;
			case "PG-13":
				return age >= 13;
			case "R":
			case "18":
				return age >= 18;
			default:
				return false;
		}
	}
}

module.exports = { AgeVerificationService };
