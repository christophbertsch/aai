import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    var email: String?
    var name: String?
    var isGuest: Bool
    var personalityProfile: PersonalityProfile?
    var createdAt: Date
    var updatedAt: Date
    
    init(email: String? = nil, name: String? = nil, isGuest: Bool = true) {
        self.id = UUID()
        self.email = email
        self.name = name
        self.isGuest = isGuest
        self.personalityProfile = nil
        self.createdAt = Date()
        self.updatedAt = Date()
    }
}

struct PersonalityProfile: Codable {
    let extraversion: Double
    let agreeableness: Double
    let conscientiousness: Double
    let neuroticism: Double
    let openness: Double
    let responses: [Int] // Raw 1-5 responses to 20 questions
    let completedAt: Date
    
    init(responses: [Int]) {
        self.responses = responses
        self.completedAt = Date()
        
        // Calculate Big Five scores based on Mini-IPIP scoring
        // Extraversion: 1, 6R, 11, 16R (R = reverse scored)
        let extraversionItems = [responses[0], 6-responses[5], responses[10], 6-responses[15]]
        self.extraversion = Double(extraversionItems.reduce(0, +)) / 4.0
        
        // Agreeableness: 2, 7R, 12, 17
        let agreeablenessItems = [responses[1], 6-responses[6], responses[11], responses[16]]
        self.agreeableness = Double(agreeablenessItems.reduce(0, +)) / 4.0
        
        // Conscientiousness: 3, 8R, 13, 18R
        let conscientiousnessItems = [responses[2], 6-responses[7], responses[12], 6-responses[17]]
        self.conscientiousness = Double(conscientiousnessItems.reduce(0, +)) / 4.0
        
        // Neuroticism: 4, 9R, 14, 19R
        let neuroticismItems = [responses[3], 6-responses[8], responses[13], 6-responses[18]]
        self.neuroticism = Double(neuroticismItems.reduce(0, +)) / 4.0
        
        // Openness: 5, 10R, 15R, 20
        let opennessItems = [responses[4], 6-responses[9], 6-responses[14], responses[19]]
        self.openness = Double(opennessItems.reduce(0, +)) / 4.0
    }
}