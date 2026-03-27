import {
  Body,
  Button,
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

interface WorkspaceInviteProps {
  inviterName: string
  workspaceName: string
  role: string
  acceptUrl: string
  expiresAt: string
}

export function WorkspaceInvite({ inviterName, workspaceName, role, acceptUrl, expiresAt }: WorkspaceInviteProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterName} invited you to {workspaceName} on Kairos</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>You've been invited</Heading>
          <Text style={text}>
            <strong>{inviterName}</strong> has invited you to join{' '}
            <strong>{workspaceName}</strong> on Kairos as a <strong>{role}</strong>.
          </Text>
          <Section style={buttonSection}>
            <Button href={acceptUrl} style={button}>Accept Invitation</Button>
          </Section>
          <Text style={smallText}>This invitation expires on {expiresAt}.</Text>
          <Hr style={hr} />
          <Text style={footer}>
            If you were not expecting this invitation, you can safely ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default WorkspaceInvite

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '40px', maxWidth: '480px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const heading = { fontSize: '22px', fontWeight: '700', color: '#004ac6', marginBottom: '16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6', margin: '8px 0' }
const buttonSection = { textAlign: 'center' as const, margin: '32px 0' }
const button = { backgroundColor: '#004ac6', color: '#ffffff', fontSize: '15px', fontWeight: '600', padding: '14px 28px', borderRadius: '6px', textDecoration: 'none' }
const smallText = { fontSize: '13px', color: '#6b7280', textAlign: 'center' as const }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', lineHeight: '1.5' }
