/**
 * Hardening tests — components/mixing/SafetySummary.tsx
 *
 * Safety UI must render every severity band, always show the educational
 * disclaimer, handle empty and very long warning lists, and drive the
 * critical-risk acknowledgment flow correctly.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { SafetySummary } from '../SafetySummary'
import type {
  SafetyValidationResult,
  SafetyWarning,
} from '@/lib/safety/comprehensive-safety-v2'

function makeWarning(overrides: Partial<SafetyWarning> = {}): SafetyWarning {
  return {
    id: 'warn-1',
    riskLevel: 'moderate',
    category: 'dosage',
    title: 'High dilution ratio',
    message: 'Beginner friendly message',
    messageIntermediate: 'Intermediate message',
    messageAdvanced: 'Advanced message',
    messageProfessional: 'Professional message',
    detailedExplanation: 'A detailed explanation of the risk.',
    affectedOils: ['clove-bud'],
    recommendation: 'Reduce the dilution to 2%.',
    requiresAcknowledgment: false,
    ...overrides,
  }
}

function makeValidation(overrides: Partial<SafetyValidationResult> = {}): SafetyValidationResult {
  return {
    canProceed: true,
    requiresAcknowledgment: false,
    safetyScore: 85,
    warnings: [],
    criticalWarnings: [],
    acknowledged: false,
    experienceLevel: 'beginner',
    ...overrides,
  }
}

describe('SafetySummary — empty states', () => {
  it('prompts to add oils when validation is null', () => {
    render(<SafetySummary validation={null} />)
    expect(screen.getByText('Safety Check')).toBeInTheDocument()
    expect(screen.getByText('Add oils to see safety analysis')).toBeInTheDocument()
  })

  it('shows Safe for Your Profile when there are no warnings', () => {
    render(<SafetySummary validation={makeValidation()} />)
    expect(screen.getByText('Safe for Your Profile')).toBeInTheDocument()
    expect(screen.getByText(/safe based on your health profile/)).toBeInTheDocument()
  })

  it('shows zero warnings in the header count', () => {
    render(<SafetySummary validation={makeValidation()} />)
    expect(screen.getByText(/0 warnings/)).toBeInTheDocument()
  })

  it('always shows the educational disclaimer in full mode', () => {
    render(<SafetySummary validation={makeValidation()} />)
    expect(screen.getByText(/educational purposes only/)).toBeInTheDocument()
    expect(screen.getByText(/qualified healthcare provider/)).toBeInTheDocument()
  })
})

describe('SafetySummary — severity grouping', () => {
  it('renders a critical warning in the Critical section with its label and title', () => {
    const critical = makeWarning({ id: 'c1', riskLevel: 'critical', title: 'Do not combine' })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [critical], criticalWarnings: [critical], safetyScore: 30 })}
      />
    )
    expect(screen.getByText('Critical (1)')).toBeInTheDocument()
    expect(screen.getByText('Critical Safety Issues')).toBeInTheDocument()
    // Critical section is expanded by default — content visible without clicking
    expect(screen.getByText('Do not combine')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })

  it('renders high warnings behind the collapsed High Risk section until expanded', () => {
    const high = makeWarning({ id: 'h1', riskLevel: 'high', title: 'Photosensitivity risk' })
    render(
      <SafetySummary validation={makeValidation({ warnings: [high], safetyScore: 60 })} />
    )
    expect(screen.getByText('High Risk Warnings')).toBeInTheDocument()
    expect(screen.getByText('High Risk (1)')).toBeInTheDocument()
    // Collapsed by default — expand it
    expect(screen.queryByText('Photosensitivity risk')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('High Risk (1)'))
    expect(screen.getByText('Photosensitivity risk')).toBeInTheDocument()
  })

  it('groups moderate warnings under Cautions', () => {
    const moderate = makeWarning({ id: 'm1', riskLevel: 'moderate', title: 'Skin sensitivity' })
    render(<SafetySummary validation={makeValidation({ warnings: [moderate] })} />)
    fireEvent.click(screen.getByText('Cautions (1)'))
    expect(screen.getByText('Skin sensitivity')).toBeInTheDocument()
    expect(screen.getByText('Caution')).toBeInTheDocument()
  })

  it('groups low and info warnings under Information', () => {
    const low = makeWarning({ id: 'l1', riskLevel: 'low', title: 'Mild note' })
    const info = makeWarning({ id: 'i1', riskLevel: 'info', title: 'General tip' })
    render(<SafetySummary validation={makeValidation({ warnings: [low, info] })} />)
    fireEvent.click(screen.getByText('Information (2)'))
    expect(screen.getByText('Mild note')).toBeInTheDocument()
    expect(screen.getByText('General tip')).toBeInTheDocument()
  })

  it('shows Review Warnings Before Use banner for non-critical warnings', () => {
    const moderate = makeWarning({ id: 'm1', riskLevel: 'moderate' })
    render(<SafetySummary validation={makeValidation({ warnings: [moderate] })} />)
    expect(screen.getByText('Review Warnings Before Use')).toBeInTheDocument()
  })

  it('renders the safety score in the ring', () => {
    render(<SafetySummary validation={makeValidation({ safetyScore: 72 })} />)
    expect(screen.getByText('72')).toBeInTheDocument()
  })
})

describe('SafetySummary — warning card details', () => {
  it('shows the beginner message for beginner experience level', () => {
    const warning = makeWarning({ riskLevel: 'critical' })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [warning], criticalWarnings: [warning], experienceLevel: 'beginner' })}
      />
    )
    expect(screen.getByText('Beginner friendly message')).toBeInTheDocument()
  })

  it('shows the professional message for professional experience level', () => {
    const warning = makeWarning({ riskLevel: 'critical' })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [warning], criticalWarnings: [warning], experienceLevel: 'professional' })}
      />
    )
    expect(screen.getByText('Professional message')).toBeInTheDocument()
    expect(screen.queryByText('Beginner friendly message')).not.toBeInTheDocument()
  })

  it('expands the detailed explanation when the card header is clicked', () => {
    const warning = makeWarning({ riskLevel: 'critical' })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [warning], criticalWarnings: [warning] })}
      />
    )
    expect(screen.queryByText('A detailed explanation of the risk.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('High dilution ratio'))
    expect(screen.getByText('A detailed explanation of the risk.')).toBeInTheDocument()
    expect(screen.getByText(/Reduce the dilution to 2%\./)).toBeInTheDocument()
  })

  it('renders alternatives as chips', () => {
    const warning = makeWarning({
      riskLevel: 'critical',
      alternatives: ['Lavender', 'Chamomile'],
    })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [warning], criticalWarnings: [warning] })}
      />
    )
    expect(screen.getByText('Alternatives:')).toBeInTheDocument()
    expect(screen.getByText('Lavender')).toBeInTheDocument()
    expect(screen.getByText('Chamomile')).toBeInTheDocument()
  })

  it('renders route-specific badges', () => {
    const warning = makeWarning({
      riskLevel: 'critical',
      routeSpecific: ['topical', 'inhalation'],
    })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [warning], criticalWarnings: [warning] })}
      />
    )
    expect(screen.getByText('topical, inhalation')).toBeInTheDocument()
  })
})

describe('SafetySummary — acknowledgment flow', () => {
  const criticalAck = makeWarning({
    id: 'ack-1',
    riskLevel: 'critical',
    requiresAcknowledgment: true,
    acknowledgmentText: 'I accept this risk',
  })

  function renderAck(onAcknowledge?: (ids: string[]) => void) {
    return render(
      <SafetySummary
        validation={makeValidation({
          warnings: [criticalAck],
          criticalWarnings: [criticalAck],
          requiresAcknowledgment: true,
        })}
        onAcknowledge={onAcknowledge}
      />
    )
  }

  it('requires acknowledgment before the user can proceed', () => {
    renderAck()
    expect(screen.getByText('Acknowledgment Required')).toBeInTheDocument()
    expect(screen.getByText(/acknowledge all critical warnings to proceed/)).toBeInTheDocument()
  })

  it('completes acknowledgment when the checkbox is ticked and reports the ids', () => {
    const onAcknowledge = jest.fn()
    renderAck(onAcknowledge)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(onAcknowledge).toHaveBeenCalledWith(['ack-1'])
    expect(screen.getByText('All Required Acknowledgments Complete')).toBeInTheDocument()
  })

  it('revokes acknowledgment when the checkbox is unticked', () => {
    const onAcknowledge = jest.fn()
    renderAck(onAcknowledge)
    const checkbox = screen.getByRole('checkbox')
    fireEvent.click(checkbox)
    fireEvent.click(checkbox)
    expect(onAcknowledge).toHaveBeenLastCalledWith([])
    expect(screen.getByText('Acknowledgment Required')).toBeInTheDocument()
  })

  it('uses the custom acknowledgment text on the checkbox label', () => {
    renderAck()
    expect(screen.getByText('I accept this risk')).toBeInTheDocument()
  })
})

describe('SafetySummary — long warning lists', () => {
  it('renders every warning across all severity sections', () => {
    const warnings = [
      makeWarning({ id: 'c1', riskLevel: 'critical', title: 'Critical one' }),
      makeWarning({ id: 'h1', riskLevel: 'high', title: 'High one' }),
      makeWarning({ id: 'h2', riskLevel: 'high', title: 'High two' }),
      makeWarning({ id: 'm1', riskLevel: 'moderate', title: 'Moderate one' }),
      makeWarning({ id: 'm2', riskLevel: 'moderate', title: 'Moderate two' }),
      makeWarning({ id: 'm3', riskLevel: 'moderate', title: 'Moderate three' }),
      makeWarning({ id: 'l1', riskLevel: 'low', title: 'Low one' }),
    ]
    render(
      <SafetySummary
        validation={makeValidation({ warnings, criticalWarnings: [warnings[0]], safetyScore: 41 })}
      />
    )
    expect(screen.getByText(/7 warnings/)).toBeInTheDocument()
    expect(screen.getByText('Critical (1)')).toBeInTheDocument()
    expect(screen.getByText('High Risk (2)')).toBeInTheDocument()
    expect(screen.getByText('Cautions (3)')).toBeInTheDocument()
    expect(screen.getByText('Information (1)')).toBeInTheDocument()

    // Expand every collapsed section and verify all titles render
    fireEvent.click(screen.getByText('High Risk (2)'))
    fireEvent.click(screen.getByText('Cautions (3)'))
    fireEvent.click(screen.getByText('Information (1)'))
    for (const title of [
      'Critical one',
      'High one',
      'High two',
      'Moderate one',
      'Moderate two',
      'Moderate three',
      'Low one',
    ]) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
  })

  it('handles a very long single-severity list without truncation in full mode', () => {
    const warnings = Array.from({ length: 12 }, (_, i) =>
      makeWarning({ id: `m${i}`, riskLevel: 'moderate', title: `Caution number ${i + 1}` })
    )
    render(<SafetySummary validation={makeValidation({ warnings })} />)
    fireEvent.click(screen.getByText('Cautions (12)'))
    expect(screen.getByText('Caution number 1')).toBeInTheDocument()
    expect(screen.getByText('Caution number 12')).toBeInTheDocument()
  })
})

describe('SafetySummary — compact mode', () => {
  it('shows All Clear with no warnings', () => {
    render(<SafetySummary validation={makeValidation()} compact />)
    expect(screen.getByText('All Clear')).toBeInTheDocument()
  })

  it('shows Critical Risks header for critical warnings', () => {
    const critical = makeWarning({ id: 'c1', riskLevel: 'critical', title: 'Compact critical' })
    render(
      <SafetySummary
        validation={makeValidation({ warnings: [critical], criticalWarnings: [critical] })}
        compact
      />
    )
    expect(screen.getByText('Critical Risks')).toBeInTheDocument()
    expect(screen.getByText('Compact critical')).toBeInTheDocument()
  })

  it('summarizes overflow with +N more warnings beyond the preview', () => {
    const warnings = Array.from({ length: 6 }, (_, i) =>
      makeWarning({ id: `h${i}`, riskLevel: 'high', title: `High ${i + 1}` })
    )
    render(<SafetySummary validation={makeValidation({ warnings })} compact />)
    expect(screen.getByText('+2 more warnings')).toBeInTheDocument()
  })

  it('shows the acknowledgment status in compact mode', () => {
    const critical = makeWarning({
      id: 'ack-c',
      riskLevel: 'critical',
      requiresAcknowledgment: true,
    })
    render(
      <SafetySummary
        validation={makeValidation({
          warnings: [critical],
          criticalWarnings: [critical],
          requiresAcknowledgment: true,
        })}
        compact
      />
    )
    expect(screen.getByText(/1 acknowledgment required/)).toBeInTheDocument()
  })
})
