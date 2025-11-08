class ModerationService {
	constructor() {
		this.flaggedContent = new Map();
	}

	async analyze(content, options = {}) {
		const { userId, type = "text" } = options;

		// Simple moderation logic - in real app this would use AI/ML
		const reasons = [];
		const lowerContent = content.toLowerCase();

		// Check for hate speech patterns
		if (/\b(hate|kill|murder|terror|bomb|weapon)\b/.test(lowerContent)) {
			reasons.push("Potential hate/violence");
		}

		// Check for child safety issues
		if (/\b(child|kid|minor).*(sex|porn|naked)\b/.test(lowerContent)) {
			reasons.push("Child safety concern");
		}

		// Check for profanity
		if (/\b(fuck|shit|bitch|asshole)\b/.test(lowerContent)) {
			reasons.push("Profanity");
		}

		const isSafe = reasons.length === 0;

		const result = {
			isSafe,
			reasons,
			category: isSafe ? "safe" : "flagged",
			contentType: type,
			userId,
			timestamp: new Date().toISOString(),
		};

		// Store flagged content for review
		if (!isSafe) {
			const id = Date.now().toString();
			this.flaggedContent.set(id, {
				id,
				content,
				...result,
			});
		}

		return result;
	}

	async getFlaggedContent() {
		return Array.from(this.flaggedContent.values());
	}

	async reviewContent(id, action, moderatorId, notes) {
		const content = this.flaggedContent.get(id);
		if (!content) {
			throw new Error("Content not found");
		}

		content.reviewed = true;
		content.reviewAction = action;
		content.moderatorId = moderatorId;
		content.reviewNotes = notes;
		content.reviewedAt = new Date().toISOString();

		return content;
	}
}

module.exports = { ModerationService };
