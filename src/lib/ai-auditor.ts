export interface AuditedClause {
  title: string;
  foundText: string;
  risk: 'safe' | 'warning' | 'danger';
  feedback: string;
}

export interface AuditReport {
  docType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number; // 0-100, where higher is safer
  summary: string;
  clauses: AuditedClause[];
  recommendations: string[];
}

export function generateAuditReport(title: string): AuditReport {
  const normalized = title.toLowerCase();

  if (normalized.includes('nda') || normalized.includes('non-disclosure') || normalized.includes('confidential')) {
    return {
      docType: 'Non-Disclosure Agreement (NDA)',
      riskLevel: 'LOW',
      riskScore: 88,
      summary: 'Standard bilateral confidentiality agreement. Low risk overall, but pay attention to the definition of confidential info and duration of obligation.',
      clauses: [
        {
          title: 'Obligation Duration',
          foundText: 'Recipients obligations under this agreement shall survive for a period of three (3) years.',
          risk: 'safe',
          feedback: 'Standard term for NDAs. Provides adequate protection without unreasonable indefinite liability.'
        },
        {
          title: 'Permitted Disclosures',
          foundText: 'Recipients may disclose information to affiliates, contractors, and legal advisors on a need-to-know basis.',
          risk: 'safe',
          feedback: 'Good safeguard. Ensures operational flexibility while maintaining confidentiality boundaries.'
        },
        {
          title: 'Remedies for Breach',
          foundText: 'Disclosing party is entitled to seek injunctive relief in addition to monetary damages.',
          risk: 'warning',
          feedback: 'Standard clause, but ensure you have the liability coverage if you are the receiving party.'
        }
      ],
      recommendations: [
        'Confirm that the definition of Confidential Information covers marked digital assets and blockchain codebases.',
        'Ensure that the obligation period aligns with your project timeline.'
      ]
    };
  }

  if (normalized.includes('freelance') || normalized.includes('service') || normalized.includes('consult') || normalized.includes('work')) {
    return {
      docType: 'Services / Freelance Agreement',
      riskLevel: 'HIGH',
      riskScore: 42,
      summary: 'High risk detected due to ambiguous Intellectual Property transfer provisions and unlimited liability clauses. Immediate attention required before signing.',
      clauses: [
        {
          title: 'Intellectual Property Ownership',
          foundText: 'All works, codes, and deliverables shall belong exclusively to the Client immediately upon creation.',
          risk: 'danger',
          feedback: 'Unsafe. Ownership should transfer only upon *receipt of full payment* to prevent payment default risk.'
        },
        {
          title: 'Liability Cap',
          foundText: 'Neither party limits its liability for any direct, indirect, or consequential damages arising under this contract.',
          risk: 'danger',
          feedback: 'Critical risk. Absolute lack of liability cap could expose your company/wallet assets to unlimited claims.'
        },
        {
          title: 'Payment Terms',
          foundText: 'Payment net 60 days upon invoice receipt.',
          risk: 'warning',
          feedback: 'Cashflow risk. Net 60 is extremely slow. We recommend negotiating net 15 or Milestone-based payouts via smart contracts.'
        }
      ],
      recommendations: [
        'Add a payment-dependency clause to the IP transfer section.',
        'Add a standard liability cap limiting damages to 1x or 2x the total contract value.',
        'Consider establishing an Escrow on the Sui blockchain for milestone payouts.'
      ]
    };
  }

  if (normalized.includes('partnership') || normalized.includes('mou') || normalized.includes('collab')) {
    return {
      docType: 'Partnership Agreement / MOU',
      riskLevel: 'MEDIUM',
      riskScore: 65,
      summary: 'General collaboration agreement. Moderate risk regarding contribution definitions and governing law/dispute resolution.',
      clauses: [
        {
          title: 'Governing Law & Jurisdiction',
          foundText: 'This agreement shall be governed by and construed in accordance with the laws of the State of Delaware.',
          risk: 'safe',
          feedback: 'Delaware is the gold standard for US-based legal disputes, providing a highly predictable environment.'
        },
        {
          title: 'Termination for Convenience',
          foundText: 'Either party may terminate this agreement at any time with 10 days written notice.',
          risk: 'warning',
          feedback: 'Short notice period. A 10-day termination might leave project integration stranded. Recommend 30 days.'
        },
        {
          title: 'Revenue Distribution',
          foundText: 'Profit sharing and token allocations shall be determined in writing by future mutual agreements.',
          risk: 'warning',
          feedback: 'Vague commitment. Ambiguity in financial terms is the number one cause of co-founder/partner splits.'
        }
      ],
      recommendations: [
        'Define explicit roles and contribution milestones to prevent disputes.',
        'Specify the exact distribution of joint intellectual property if the partnership dissolves.'
      ]
    };
  }

  // Default fallback
  return {
    docType: 'General Legal Agreement',
    riskLevel: 'MEDIUM',
    riskScore: 72,
    summary: 'Standard agreement profile. Check for governing jurisdiction and liability limitation clauses before finalizing.',
    clauses: [
      {
        title: 'Governing Law',
        foundText: 'Subject to the jurisdiction of the local courts of the requestor’s registration.',
        risk: 'warning',
        feedback: 'Vague jurisdiction. Can make enforcement difficult if co-signers reside in different regions.'
      },
      {
        title: 'Liability Cap',
        foundText: 'Liability of each party is limited to the fees paid under this agreement.',
        risk: 'safe',
        feedback: 'Standard protective clause. Keeps potential financial damages predictable.'
      }
    ],
    recommendations: [
      'Ensure all co-signers have verified identity credentials linked to their signing wallets.',
      'Explicitly confirm dispute resolution procedures (e.g. arbitration).'
    ]
  };
}
