/**
 * Google Forms API Integration for creating automated quizzes with answer keys.
 */

export const createGoogleQuizForm = async ({
  accessToken,
  title,
  paperCode,
  grade,
  setNumber,
  questions
}) => {
  if (!accessToken) {
    throw new Error('Google OAuth token not available. Please sign out and sign in again to authorize Google Forms creation.');
  }

  const formTitle = `${paperCode} Set ${setNumber}: ${title}`;
  const formDescription = `Math Abacus Practice Question Paper\nClass/Grade: ${grade} | Paper Code: ${paperCode} | Set: ${setNumber}\nGenerated via QSpace Academy`;

  // Step 1: Create the empty Google Form
  const createResponse = await fetch('https://forms.googleapis.com/v1/forms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      info: {
        title: formTitle,
        documentTitle: `${paperCode} Set ${setNumber}`
      }
    })
  });

  if (!createResponse.ok) {
    const errData = await createResponse.json().catch(() => ({}));
    const message = errData?.error?.message || createResponse.statusText;
    if (createResponse.status === 401) {
      throw new Error('Your Google session has expired. Please sign out and sign back in to refresh Google permissions.');
    }
    throw new Error(`Google Forms API Error: ${message}`);
  }

  const formData = await createResponse.json();
  const formId = formData.formId;

  // Step 2: Batch Update to turn on Quiz Mode and add all questions with answer keys
  const requests = [
    // 1. Enable Quiz Settings
    {
      updateSettings: {
        settings: {
          quizSettings: {
            isQuiz: true
          }
        },
        updateMask: 'quizSettings.isQuiz'
      }
    },
    // 2. Set description
    {
      updateFormInfo: {
        info: {
          description: formDescription
        },
        updateMask: 'description'
      }
    }
  ];

  // 3. Append question items
  questions.forEach((q, idx) => {
    requests.push({
      createItem: {
        item: {
          title: `Q${idx + 1}.  ${q.questionText}`,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: {
                type: 'RADIO',
                options: [
                  { value: `(A) ${q.optionA}` },
                  { value: `(B) ${q.optionB}` },
                  { value: `(C) ${q.optionC}` },
                  { value: `(D) ${q.optionD}` }
                ],
                shuffle: false
              },
              grading: {
                pointValue: 1,
                correctAnswers: {
                  answers: [
                    { value: `(${q.correctOption}) ${q.correctAnswer}` }
                  ]
                }
              }
            }
          }
        },
        location: { index: idx }
      }
    });
  });

  const batchResponse = await fetch(`https://forms.googleapis.com/v1/forms/${formId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ requests })
  });

  if (!batchResponse.ok) {
    const errData = await batchResponse.json().catch(() => ({}));
    const message = errData?.error?.message || batchResponse.statusText;
    console.warn('Batch update failed after form creation:', message);
    // Return formId even if batch update had partial failure so user can access form shell
  }

  const formEditUrl = `https://docs.google.com/forms/d/${formId}/edit`;
  const formResponderUrl = formData.responderUri || `https://docs.google.com/forms/d/e/${formId}/viewform`;

  return {
    formId,
    formEditUrl,
    formResponderUrl
  };
};
