class ComplianceService {
	constructor() {
		this.events = [];
	}

	async logEvent(event) {
		const complianceEvent = {
			id: Date.now().toString(),
			timestamp: new Date().toISOString(),
			...event,
		};

		this.events.push(complianceEvent);
		console.log("Compliance event logged:", complianceEvent);

		return complianceEvent;
	}

	async getEvents(filters = {}) {
		let filtered = this.events;

		if (filters.category) {
			filtered = filtered.filter((e) => e.category === filters.category);
		}

		if (filters.userId) {
			filtered = filtered.filter((e) => e.userId === filters.userId);
		}

		if (filters.startDate) {
			filtered = filtered.filter((e) => e.timestamp >= filters.startDate);
		}

		if (filters.endDate) {
			filtered = filtered.filter((e) => e.timestamp <= filters.endDate);
		}

		return filtered;
	}

	async getEventById(id) {
		return this.events.find((e) => e.id === id) || null;
	}
}

module.exports = { ComplianceService };
