import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Stepper } from './Stepper'

describe('Stepper', () => {
  it('renders all 4 step labels', () => {
    render(<Stepper currentStep={1} />)
    expect(screen.getByText('Resume Analysis')).toBeInTheDocument()
    expect(screen.getByText('Interview Plan')).toBeInTheDocument()
    expect(screen.getByText('Live Session')).toBeInTheDocument()
    expect(screen.getByText('Evaluation')).toBeInTheDocument()
  })

  it('calls onStepClick with the step number when a completed step circle is clicked', () => {
    const onStepClick = vi.fn()
    render(<Stepper currentStep={3} onStepClick={onStepClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 1' }))
    expect(onStepClick).toHaveBeenCalledWith(1)
  })

  it('calls onStepClick with the correct number for each completed step', () => {
    const onStepClick = vi.fn()
    render(<Stepper currentStep={4} onStepClick={onStepClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Go to step 2' }))
    expect(onStepClick).toHaveBeenCalledWith(2)
  })

  it('does not render clickable buttons for the active or upcoming steps', () => {
    render(<Stepper currentStep={2} onStepClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Go to step 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go to step 3' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go to step 4' })).not.toBeInTheDocument()
  })

  it('does not render a button for a completed step when onStepClick is not provided', () => {
    render(<Stepper currentStep={2} />)
    expect(screen.queryByRole('button', { name: 'Go to step 1' })).not.toBeInTheDocument()
  })

  it('renders completed step labels with indigo color and semi-bold weight', () => {
    render(<Stepper currentStep={3} />)
    const label = screen.getByText('Resume Analysis')
    expect(label.className).toContain('text-indigo-400')
    expect(label.className).toContain('font-semibold')
  })

  it('renders the active step label with white color and semi-bold weight', () => {
    render(<Stepper currentStep={2} />)
    const label = screen.getByText('Interview Plan')
    expect(label.className).toContain('text-slate-100')
    expect(label.className).toContain('font-semibold')
  })
})
