import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface VerifyEmailProps {
  name: string
  otp: string
}

export function VerifyEmail({ name, otp }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Kairos verification code: {otp}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>Kairos</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Please use the code below to verify your email address and complete your access request.
          </Text>
          <Section style={otpSection}>
            <Text style={otpCode}>{otp}</Text>
          </Section>
          <Text style={smallText}>This code expires in <strong>15 minutes</strong>.</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you did not request access to Kairos, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default VerifyEmail

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '20px', fontWeight: '700', color: '#004ac6', marginBottom: '24px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const otpSection = { textAlign: 'center' as const, margin: '32px 0' }
const otpCode = { fontSize: '48px', fontWeight: '700', letterSpacing: '12px', color: '#004ac6', margin: '0' }
const smallText = { fontSize: '13px', color: '#6b7280', margin: '8px 0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }
