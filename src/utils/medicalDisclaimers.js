/**
 * Medical Disclaimers and Safety Features
 * Provides standardized medical disclaimers and safety warnings for assessments
 */

/**
 * Standard medical disclaimer for all assessments
 */
const STANDARD_DISCLAIMER = 
  'This is not a medical diagnosis. Please consult with a healthcare professional for an accurate diagnosis.';

/**
 * Professional consultation recommendation
 */
const CONSULTATION_RECOMMENDATION = 
  'We strongly recommend consulting with a qualified healthcare professional for proper evaluation and treatment.';

/**
 * Low confidence warning
 */
const LOW_CONFIDENCE_WARNING = 
  'Our AI has low confidence in this assessment. Please seek professional medical advice for an accurate diagnosis.';

/**
 * Emergency symptom warning
 */
const EMERGENCY_WARNING = 
  '⚠️ EMERGENCY: You may be experiencing symptoms that require immediate medical attention. Please call 911 or go to the nearest emergency room immediately.';

/**
 * Medication consultation disclaimer
 */
const MEDICATION_DISCLAIMER = 
  'Always consult with a healthcare provider before starting any new medication or treatment. This information is for educational purposes only.';

/**
 * Prescription medication warning
 */
const PRESCRIPTION_WARNING = 
  'This medication requires a prescription. Please consult with a doctor before use.';

/**
 * Generate comprehensive disclaimer for an assessment
 * @param {Object} options - Options for disclaimer generation
 * @param {number} options.confidence - Confidence score (0-1)
 * @param {string} options.urgency - Urgency level (routine, urgent, emergency)
 * @param {Array} options.redFlags - Array of red flag symptoms
 * @param {boolean} options.hasProducts - Whether assessment includes product recommendations
 * @returns {string} Comprehensive disclaimer text
 */
function generateAssessmentDisclaimer(options = {}) {
  const {
    confidence = 1,
    urgency = 'routine',
    redFlags = [],
    hasProducts = false
  } = options;

  let disclaimer = STANDARD_DISCLAIMER;

  // Add consultation recommendation
  disclaimer += '\n\n' + CONSULTATION_RECOMMENDATION;

  // Add low confidence warning if applicable
  if (confidence < 0.6) {
    disclaimer += '\n\n' + LOW_CONFIDENCE_WARNING;
  }

  // Add emergency warning if applicable
  if (urgency === 'emergency' || redFlags.length > 0) {
    disclaimer = EMERGENCY_WARNING + '\n\n' + disclaimer;
  }

  // Add medication disclaimer if products are included
  if (hasProducts) {
    disclaimer += '\n\n' + MEDICATION_DISCLAIMER;
  }

  return disclaimer;
}

/**
 * Generate warning messages for an assessment
 * @param {Object} options - Options for warning generation
 * @param {number} options.confidence - Confidence score (0-1)
 * @param {string} options.urgency - Urgency level (routine, urgent, emergency)
 * @param {Array} options.redFlags - Array of red flag symptoms
 * @returns {Array} Array of warning objects
 */
function generateWarnings(options = {}) {
  const {
    confidence = 1,
    urgency = 'routine',
    redFlags = []
  } = options;

  const warnings = [];

  // Emergency warning
  if (urgency === 'emergency' || redFlags.length > 0) {
    warnings.push({
      type: 'emergency',
      severity: 'critical',
      message: EMERGENCY_WARNING,
      action: 'Call 911 or go to the nearest emergency room'
    });
  }

  // Low confidence warning
  if (confidence < 0.6) {
    warnings.push({
      type: 'low_confidence',
      severity: 'warning',
      message: LOW_CONFIDENCE_WARNING,
      action: 'Schedule an appointment with a healthcare provider'
    });
  }

  // Urgent care warning
  if (urgency === 'urgent') {
    warnings.push({
      type: 'urgent_care',
      severity: 'high',
      message: 'Your symptoms may require prompt medical attention.',
      action: 'Consider visiting an urgent care facility or contacting your doctor today'
    });
  }

  return warnings;
}

/**
 * Add medication disclaimers to product recommendations
 * @param {Array} products - Array of product objects
 * @returns {Array} Products with added disclaimers
 */
function addMedicationDisclaimers(products = []) {
  return products.map(product => {
    const productWithDisclaimer = { ...product };

    // Add prescription warning for prescription medications
    if (product.isPrescription) {
      productWithDisclaimer.disclaimer = PRESCRIPTION_WARNING;
      productWithDisclaimer.requiresConsultation = true;
    } else {
      // Add general medication disclaimer for OTC products
      productWithDisclaimer.disclaimer = MEDICATION_DISCLAIMER;
      productWithDisclaimer.requiresConsultation = false;
    }

    return productWithDisclaimer;
  });
}

/**
 * Check if emergency care should be prioritized in next steps
 * @param {string} urgency - Urgency level
 * @param {Array} redFlags - Array of red flag symptoms
 * @returns {boolean} True if emergency care should be prioritized
 */
function shouldPrioritizeEmergencyCare(urgency, redFlags = []) {
  return urgency === 'emergency' || redFlags.length > 0;
}

/**
 * Generate emergency next step
 * @returns {Object} Emergency next step object
 */
function generateEmergencyNextStep() {
  return {
    title: 'Seek Emergency Care Immediately',
    description: 'Your symptoms may indicate a serious condition requiring immediate medical attention. Call 911 or go to the nearest emergency room.',
    icon: 'emergency',
    actionType: 'emergency',
    priority: 1,
    urgent: true
  };
}

/**
 * Generate professional consultation next step
 * @param {number} confidence - Confidence score
 * @returns {Object} Consultation next step object
 */
function generateConsultationNextStep(confidence) {
  const isLowConfidence = confidence < 0.6;
  
  return {
    title: isLowConfidence ? 'Consult a Healthcare Professional (Recommended)' : 'Consult a Healthcare Professional',
    description: isLowConfidence 
      ? 'Due to the complexity of your symptoms, we recommend getting a professional medical evaluation for an accurate diagnosis.'
      : 'Schedule an appointment with a healthcare provider to discuss your symptoms and get a proper diagnosis.',
    icon: 'doctor',
    actionType: 'consultation',
    priority: isLowConfidence ? 2 : 3,
    urgent: isLowConfidence
  };
}

module.exports = {
  // Constants
  STANDARD_DISCLAIMER,
  CONSULTATION_RECOMMENDATION,
  LOW_CONFIDENCE_WARNING,
  EMERGENCY_WARNING,
  MEDICATION_DISCLAIMER,
  PRESCRIPTION_WARNING,
  
  // Functions
  generateAssessmentDisclaimer,
  generateWarnings,
  addMedicationDisclaimers,
  shouldPrioritizeEmergencyCare,
  generateEmergencyNextStep,
  generateConsultationNextStep
};
