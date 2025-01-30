import React from 'react';

import Hero from '../../Hero';
import BackgroundURL from './background.jpg';
import { classNames } from '@/util/utils';

import styles from './TermsAndConditions.module.css';

export interface TermsAndConditionsProps {
  className?: string;
}

export default function TermsAndConditions({ className }: TermsAndConditionsProps) {
  return (
    <div className={classNames(className, styles.termsAndConditions)}>
      <Hero
        backgroundType="image"
        backgroundURL={BackgroundURL.src}
        title="Terms & conditions"
        content="By using the Open Brain Platform, you agree to our terms and privacy policies, which outline data usage and your responsibilities. Please review them carefully."
        next="Browse through our documents"
      />
      <h1>Terms & conditions</h1>
      <p>
        Welcome to the Open Brain Platform. By accessing and using our platform, you agree to comply
        with and be bound by the following terms and conditions. If you do not agree with any part
        of these terms, please do not use our services.
      </p>
      <ol>
        <li>
          <small>01</small>
          <h2>Introduction</h2>
          The Open Brain Platform provides tools and services for neuroscience research, including
          brain model building, model simulations, literature search, and AI-driven support. These
          terms govern your access and use of the platform’s features and services.
        </li>
        <li>
          <small>02</small>
          <h2>Eligibility</h2>
          By using the Open Brain Platform, you represent that you:
          <ul>
            <li>
              Are at least 18 years of age or have the consent of a legal guardian. • Have the legal
              authority to enter into these terms and comply with all applicable laws and
              regulations.
            </li>
            <li>Will provide accurate and up-to-date registration information.</li>
          </ul>
        </li>
        <li>
          <small>03</small>
          <h2>Account registration and security</h2>
          By using the Open Brain Platform, you represent that you:
          <ul>
            <li>
              Are at least 18 years of age or have the consent of a legal guardian. • Have the legal
              authority to enter into these terms and comply with all applicable laws and
              regulations.
            </li>
            <li>Will provide accurate and up-to-date registration information.</li>
          </ul>
        </li>
        <li>
          <small>04</small>
          <h2>Use of service</h2>
          When using our platform, you agree to:
          <ul>
            <li>Use the platform solely for research, academic, or educational purposes.</li>
            <li>Not misuse the platform for unethical or illegal activities.</li>
            <li>Comply with applicable data protection and privacy laws.</li>
            <li>
              Not attempt to reverse engineer, copy, or resell any part of the platform without
              permission.
            </li>
          </ul>
        </li>
        <li>
          <small>05</small>
          <h2>Intellectual property</h2>
          <ul>
            <li>
              All content, tools, and software provided by the Open Brain Platform are the property
              of Open Brain Institute or its licensors.
            </li>
            <li>
              Users retain ownership of their original research and data uploaded to the platform.
            </li>
            <li>Unauthorized use of our intellectual property is strictly prohibited.</li>
          </ul>
        </li>
        <li>
          <small>06</small>
          <h2>User-Generated Content</h2>
          By submitting data, models, or other content to the platform, you agree that:
          <ul>
            <li>You have the right to share the content.</li>
            <li>
              You grant us a non-exclusive, worldwide, royalty-free license to use and display your
              content for platform improvement and research purposes.
            </li>
            <li>
              You will not upload content that is illegal, harmful, or infringes on third-party
              rights.
            </li>
          </ul>
        </li>
        <li>
          <small>07</small>
          <h2>Privacy and Data Protection</h2>
          <ul>
            <li>
              Our Privacy Policy, incorporated into these terms, outlines how we collect, store, and
              process your personal data.
            </li>
            <li>
              We prioritize data security but cannot guarantee absolute protection against cyber
              threats.
            </li>
            <li>Users are responsible for securing sensitive data they upload to the platform.</li>
          </ul>
        </li>
      </ol>
      <h1>Privacy</h1>
      <p>
        The Open Brain Platform (“we,” “our,” or “us”) is committed to protecting your privacy. This
        policy outlines how we collect, use, and protect your data when using our services,
        including brain model building, simulations, literature searches, and AI support.
      </p>
      <p>
        We collect personal information such as your name, email, and usage data when you create an
        account, interact with our platform, or contact support. Additional data, including device
        information and browsing behavior, may be collected through cookies and tracking
        technologies. Your data helps us provide, personalize, and improve our services while
        ensuring platform security.
      </p>
      <p>
        We do not sell or rent your personal information. Data may be shared with trusted service
        providers, legal authorities when required, or during business transfers. We implement
        security measures such as encryption and access controls to protect your information but
        encourage users to keep their credentials secure.
      </p>
      <p>
        You have rights over your data, including access, correction, deletion, and opting out of
        marketing communications. To exercise these rights, contact us at
        [privacy@openbrainplatform.com].
      </p>
      <p>
        We retain your data only as long as necessary for operational and legal purposes. Our
        platform may contain links to third-party services with separate privacy practices.
      </p>
      <p>
        We may update this policy periodically. Continued use of our services after updates
        indicates your acceptance of the revised policy.
      </p>
      <p>
        For questions, contact us at{' '}
        <a href="mailto:privacy@openbrainplatform.com">privacy@openbrainplatform.com</a>.
      </p>
      <p>By using the Open Brain Platform, you acknowledge and agree to this Privacy Policy.</p>
    </div>
  );
}
