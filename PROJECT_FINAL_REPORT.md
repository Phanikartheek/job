# AI-Powered Recruitment Fraud Detection System

**Keywords:** Recruitment Fraud Detection, Transformer-Based NLP, Anomaly Detection, Ensemble Learning, Machine Learning, Deep Learning, Job Scam Identification, Risk Scoring, Explainable AI, Online Recruitment Security

## Abstract
Online platforms have created greater access to employment opportunities, but it has also led to an increase in sophisticated job-related scams. Fraudulent listings often deceive individuals into making upfront payments or disclosing sensitive personal and financial information under false pretences. Conventional rule-based detection approaches are often ineffective in this context, as they depend on static criteria and struggle to adapt to the evolving strategies employed by scammers.

To address these challenges, this study introduces an intelligent detection system for identifying fraudulent recruitment activities by integrating both machine learning and deep learning techniques. The proposed framework leverages multiple complementary models to analyze job postings from different perspectives. A transformer-based language model evaluates textual content to detect unusual phrasing, inconsistencies, and suspicious patterns within job descriptions. In parallel, an anomaly detection mechanism identifies irregularities and outliers in the dataset that may signal fraudulent behaviour. Additionally, a dedicated neural network processes structured attributes—such as salary information, email domain credibility, geographic consistency, and organizational details—to assess the authenticity of each listing.

The outputs from these models are combined using a weighted ensemble strategy to generate a unified risk score ranging from 0 to 100. Based on this score, job postings are categorized into distinct risk levels, including low, medium, high, and critical, enabling users to make informed decisions. To enhance transparency and user trust, the system also provides interpretable explanations by highlighting the key factors influencing each risk evaluation.

A web-based application has been developed to support practical implementation of the system. It enables real-time analysis of individual job postings, batch processing through file uploads, and automated report generation. The backend infrastructure is designed for efficient data management and scalability, allowing it to handle large volumes of recruitment data seamlessly. Experimental findings demonstrate the system’s capability to effectively detect deceptive recruitment patterns, establishing it as a reliable solution for improving safety and trust in online hiring environments.

Overall, this work highlights the potential of advanced artificial intelligence techniques in addressing emerging cybersecurity threats within the digital recruitment landscape.

---

## I. Introduction
In today’s digital environment, online platforms have transformed the job search process by making it faster, more accessible, and widely available. Despite these advantages, the growth of digital recruitment has also led to a noticeable increase in fraudulent job postings. Cybercriminals exploit these platforms by creating deceptive listings that mislead applicants into paying fees or sharing sensitive personal and financial information. Such fraudulent activities particularly affect inexperienced job seekers, including recent graduates, often resulting in financial loss, identity theft, and reduced confidence in online hiring systems.

Traditional techniques for detecting fake job postings primarily rely on manual verification or predefined rule-based systems. While these methods can identify basic fraud patterns, they are no longer sufficient in dealing with modern scams. Fraudsters continuously refine their tactics, making fraudulent listings appear increasingly realistic and difficult to detect using static rules alone. This limitation highlights the need for more advanced, adaptive, and automated detection mechanisms.

To address this issue, this study introduces an AI-based Recruitment Fraud Detection System designed to assess the authenticity of job postings. The system assigns a fraud risk score on a scale from 0 to 100, where lower scores indicate legitimate opportunities and higher scores suggest potential fraud. By integrating Artificial Intelligence (AI) and Machine Learning (ML) techniques, the system is capable of identifying complex patterns and subtle irregularities that are not easily recognized through manual analysis.

The solution is implemented through an interactive web-based platform that enables users to submit job-related information and receive immediate evaluation results along with explanatory feedback. This approach not only assists users in identifying suspicious listings but also improves awareness of common fraud indicators. Ultimately, the system aims to strengthen user safety, promote informed decision-making, and foster greater trust in digital recruitment environments.

**A. Text-Oriented Fraud Analysis**
This module utilizes Natural Language Processing (NLP) to examine the textual content of job postings for potentially deceptive patterns. Instead of relying solely on predefined keywords, it evaluates contextual cues and linguistic irregularities often associated with fraudulent listings. Phrases that promise unrealistic benefits—such as quick earnings or guaranteed success—are treated as warning signals. When such patterns are identified, their influence is reflected in an increased fraud risk score.

**B. Pattern Deviation Detection**
To identify suspicious inconsistencies, the system incorporates anomaly detection techniques that analyse structured job attributes. Factors such as salary levels, experience requirements, and job roles are compared against typical industry patterns. Significant deviations—like disproportionately high pay for minimal qualifications—are flagged as abnormal, contributing to the identification of potentially fraudulent postings.

**C. Structured Data Verification**
This component evaluates key metadata associated with job listings, including organizational details, email authenticity, and geographic information. Indicators such as non-corporate email domains, incomplete company profiles, or mismatched location data are treated as potential red flags. These inconsistencies are systematically assessed and factored into the overall fraud evaluation.

**D. Predictive Classification Model**
A supervised learning approach is employed to distinguish between legitimate and fraudulent job postings. The model is trained on previously labelled data, enabling it to recognize complex patterns associated with both categories. Once deployed, it can assess new listings with considerable accuracy, while continuous learning mechanisms allow it to adapt to emerging fraud tactics over time.

**E. Integrated Risk Evaluation**
The system combines insights from all analytical modules to compute a consolidated fraud risk score ranging from 0 to 100. This score is then mapped to predefined risk categories—Low, Medium, High, and Critical—offering users a straightforward interpretation of the listing’s credibility and associated risk level.

**F. Adaptive Feedback Mechanism**
To enhance long-term performance, the platform incorporates a feedback loop that allows users to report misclassifications or share their experiences. This information is used to refine detection models, uncover new fraud patterns, and improve overall system accuracy. As a result, the system evolves continuously, becoming more robust and responsive to real-world scenarios.

---

## II. Literature Survey

*[1] Vidros et al., 2017 – Machine Learning-Based Recruitment Fraud Detection.*
Vidros and colleagues developed a machine learning framework to identify fraudulent job advertisements by analysing features such as job descriptions, company information, and salary patterns. The study also introduced a publicly available dataset for recruitment fraud research and evaluated model performance using standard classification metrics.

*[2] Afzal et al., 2023 – Feature Selection and Resampling for Fraud Detection.*
Afzal et al. proposed a fraud detection approach that emphasizes feature selection and resampling strategies to improve model performance. By addressing class imbalance through advanced sampling methods, the study enhances classification accuracy.

*[3] Taneja et al., 2025 – Fraud-BERT for Context-Aware Detection.*
Taneja and co-authors introduced Fraud-BERT, a transformer-based model designed to capture contextual information within job descriptions. By leveraging deep learning and NLP, the model achieves improved detection accuracy compared to traditional approaches.

*[4] Vu et al., 2024 – Deep Learning-Based NLP for Job Fraud Detection.*
Vu and colleagues utilized deep learning-based NLP methods to analyse semantic patterns in job postings. Their approach focuses on extracting meaningful linguistic features to enhance fraud detection performance.

*[5] Medapati et al., 2025 – Machine Learning Approach for Recruitment Fraud.*
Medapati et al. presented a machine learning system that combines structured and unstructured data to improve the detection of fraudulent job listings. The integration of multiple data types contributes to better predictive performance.

*[6] Mutemi and Bacao, 2023 – Review of Machine Learning in Fraud Detection.*
This study provides a comprehensive overview of machine learning approaches used in fraud detection, including classification, clustering, and anomaly detection techniques.

*[7] Bounab et al., 2024 – Handling Class Imbalance Using SMOTE-ENN.*
Bounab and co-authors focused on improving detection accuracy by handling class imbalance using SMOTE-ENN techniques. Their approach enhances model performance in imbalanced datasets.

*[8] Mienye and Jere, 2024 – Deep Learning for Fraud Detection.*
Mienye and Jere reviewed various deep learning models applied to fraud detection tasks, highlighting challenges such as data imbalance and model optimization.

*[9] Alzahrani et al., 2025 – Ad Click Fraud Detection Using ML and DL.*
Alzahrani and colleagues introduced a hybrid model combining machine learning and deep learning methods to detect ad click fraud. The approach improves pattern recognition and classification accuracy.

*[10] Mohammed et al., 2024 – Feature Selection for Cyber-Attack Detection.*
Mohammed et al. examined the role of feature selection techniques in enhancing model performance for cyber-attack detection. Their findings highlight the importance of selecting relevant features to improve accuracy.

*[11] Karthik Reddy et al., 2025 – Deep Learning for Recruitment Fraud Detection.*
Karthik Reddy and co-authors proposed a deep learning-based framework tailored for detecting fraudulent job postings. By analysing job-related features with advanced models, the system achieves improved prediction accuracy.

---

## III. Proposed Solution
The proposed system is an AI-powered Recruitment Fraud Detection System designed to automatically analyze job postings and determine whether they are genuine or fraudulent. The system integrates multiple intelligent models and rule-based techniques to provide accurate, real-time fraud detection, thereby protecting job seekers from online scams and misleading opportunities.

The system follows a multi-model AI pipeline architecture, where different models handle different aspects of the job data. It processes both textual information (job title, description, requirements) and structured metadata (salary, email, company name, location) to generate a comprehensive fraud risk score ranging from 0 to 100.

The first component is the Text Analyzer, which uses Natural Language Processing (NLP)-based techniques to examine job descriptions. It identifies suspicious keywords and phrases such as “earn money fast,” “no experience required,” and “registration fee.” In addition, it evaluates writing quality, grammatical patterns, repetition, and abnormal formatting, which are often indicators of fraudulent postings.

The second component is the Anomaly Detection Model, implemented using the Isolation Forest algorithm. This model detects unusual or inconsistent patterns such as extremely high salaries, mismatches between job roles and descriptions, or requests for upfront payments. It works by isolating outliers in the dataset, which often correspond to fraudulent entries.

The third component is the Metadata Analysis Model, which evaluates structured fields. It verifies whether the email domain is official or personal, checks salary ranges against expected values, and validates company-related information. This component helps identify hidden fraud signals that may not be detected through text analysis alone.

To enhance accuracy, the system combines the outputs of the Text Analyzer and Anomaly Detection Model into a Content Score using a weighted approach (75% text analysis and 25% anomaly detection). This score is then integrated with the metadata score to compute the final fraud score:

`Final Score = (70% × Content Score) + (30% × Metadata Score)`

The system also incorporates a rule-based layer that flags critical fraud indicators such as payment requests, missing company details, or suspicious contact methods. These rules act as an additional safety layer alongside AI models.

The system is implemented as a web-based application using modern technologies such as React and TypeScript for the frontend, and Supabase for database management and authentication. The backend logic and AI models are integrated within the system and can also be executed using Python for testing and experimentation.

When a user inputs job details, the system processes the data through the AI pipeline and provides:
- Fraud score (0–100)
- Risk level (Low, Medium, High, Critical)
- Detected fraud indicators (flags)
- AI-generated explanation for transparency

Additional features of the system include:
- PDF report generation for saving and sharing analysis results
- History tracking using cloud storage for future reference
- Bulk job analysis through CSV file upload
- Visualization tools such as risk gauges and trend graphs
- User feedback system to improve model performance over time

To ensure reliability, the system includes input validation, error handling, and data preprocessing techniques to handle incomplete or incorrect inputs. The modular architecture allows easy scalability and supports future integration with deep learning models, real-time job portals, and large-scale datasets. Overall, the proposed system provides a secure, intelligent, and user-friendly solution for detecting recruitment fraud and improving trust in online job platforms.

---

## IV. Methodology
The methodology of the proposed AI-Powered Recruitment Fraud Detection System follows a structured, multi-stage pipeline that processes job posting data, applies multiple analytical models, and generates an accurate fraud risk assessment. The workflow is designed to ensure reliability, scalability, and real-time performance.

The process begins with data input collection, where users provide job details such as job title, company name, location, salary, email address, and job description through a web interface. The system validates the input to ensure completeness and correctness before further processing.

The next stage is data preprocessing, where the collected data is cleaned and standardized. Textual data is normalized by removing unwanted characters, converting to lowercase, and formatting properly, while structured data is checked for missing or inconsistent values. This step ensures high-quality input for analysis.

After preprocessing, the system performs feature extraction, identifying important attributes from both text and metadata. Text features include keywords, phrases, frequency patterns, and content length, while metadata features include salary range, email domain type, company validity, and location consistency. These features play a key role in detecting fraud patterns.

The system then applies a multi-model analysis approach consisting of three main components:
- **Text Analysis Model:** Analyzes job descriptions and titles to detect suspicious keywords, misleading phrases, and abnormal writing patterns. It also evaluates grammar quality and content consistency.
- **Anomaly Detection Model:** Identifies unusual patterns such as unrealistic salaries, mismatched job roles, and requests for upfront payments. This model helps detect outliers using statistical and machine learning techniques.
- **Metadata Analysis Model:** Examines structured fields such as email domain authenticity, salary validity, company presence, and location correctness to identify hidden fraud indicators.

The outputs of the Text Analysis Model and Anomaly Detection Model are combined to generate a Content Score using a weighted approach. This score is then integrated with the Metadata Score to calculate the Final Fraud Score using a predefined formula.

Based on the final score, the system performs risk classification, categorizing job postings into four levels: Low Risk, Medium Risk, High Risk, and Critical Risk.

The results are displayed through a user-friendly interface, including the fraud score, detected risk factors, and an AI-generated explanation. Additional features such as report generation, history tracking, and visualization tools enhance user experience.

To ensure system effectiveness, performance is evaluated using metrics such as accuracy, precision, recall, and F1-score on sample datasets. The system demonstrates high accuracy in distinguishing between genuine and fraudulent job postings. The modular design of the methodology allows easy scalability and future enhancements, including integration with real-time job platforms and advanced deep learning models.

---

## V. Algorithms

**a) RoBERTa-Based Text Analysis**
This component focuses on evaluating the textual content of job postings to identify indicators of potential fraud. Although conceptually inspired by the RoBERTa architecture, the implementation adopts a rule-based strategy to ensure computational efficiency. The algorithm consolidates multiple text fields—such as job title, description, requirements, and company name—into a unified input, which is then normalized for consistent processing. The analysis involves detecting high-risk phrases commonly associated with fraudulent listings, including expressions that promise quick earnings or require upfront payments.

**b) Isolation Forest (Anomaly Detection)**
To identify irregular patterns that are not evident from textual analysis alone, an anomaly detection approach inspired by the Isolation Forest algorithm is utilized. This technique focuses on isolating data points that significantly differ from standard job posting characteristics. The system examines factors such as unusually high salary offers compared to required qualifications, requests for upfront payments, and the use of informal communication channels.

**c) Metadata-Based Evaluation Module**
This module analyses structured attributes associated with job postings, including salary information, email domain authenticity, geographic details, and company identification. While described as a neural network, the implementation follows a rule-driven evaluation framework for interpretability and efficiency.

**d) Integrated Content Evaluation**
The content evaluation stage combines the outputs of the text analysis and anomaly detection modules to produce a unified score. Greater emphasis is placed on textual indicators, with a weighting scheme of 75% assigned to the text-based score and 25% to the anomaly score.

**e) Final Fraud Risk Assessment**
The final stage involves combining the previously computed content and metadata scores to derive an overall fraud risk value. This is achieved using a weighted aggregation strategy:
`Final Score = (0.70 × Content Score) + (0.30 × Metadata Score)`
The computed score, ranging from 0 to 100, is then translated into four distinct risk categories: Low, Medium, High, and Critical.

---

## VI. Performance Evaluation Metrics (Accuracy, Precision, Recall, F1-Score)

To evaluate the effectiveness of the proposed AI-Powered Recruitment Fraud Detection System, we use four standard machine learning classification metrics: **Accuracy**, **Precision**, **Recall**, and **F1-Score**. These metrics help us understand how well the system can correctly identify fraudulent job postings and separate them from legitimate ones.

All four metrics are calculated using the values from the **Confusion Matrix**, which is a table that summarizes the prediction results:

| | **Predicted: Fraud** | **Predicted: Legitimate** |
|---|---|---|
| **Actual: Fraud** | True Positive (TP) | False Negative (FN) |
| **Actual: Legitimate** | False Positive (FP) | True Negative (TN) |

Where:
- **True Positive (TP):** The system correctly identified a fraudulent job as fraud.
- **True Negative (TN):** The system correctly identified a legitimate job as legitimate.
- **False Positive (FP):** The system wrongly flagged a legitimate job as fraud (false alarm).
- **False Negative (FN):** The system missed a fraudulent job and labelled it as legitimate (missed detection).

---

### 1. Accuracy

**Definition:** Accuracy measures the overall correctness of the model. It tells us what percentage of all job postings (both fraud and legitimate) were classified correctly.

**Formula:**

```
                    TP + TN
Accuracy = ─────────────────────────
              TP + TN + FP + FN
```

**Example:** If the system analyzed 100 job postings and correctly classified 95 of them (both fraud and legitimate combined), then:

```
Accuracy = 95 / 100 = 0.95 = 95%
```

**Significance in This Project:** A high accuracy indicates that the system reliably classifies the majority of job postings into their correct risk categories (Low, Medium, High, Critical). However, accuracy alone can be misleading when the dataset is imbalanced (i.e., there are far more legitimate jobs than fraudulent ones), which is why we also use the following metrics.

---

### 2. Precision (Positive Predictive Value)

**Definition:** Precision answers the question: *"Out of all the jobs the system flagged as fraudulent, how many were actually fraudulent?"* It measures how trustworthy the system's fraud alerts are.

**Formula:**

```
                      TP
Precision = ─────────────────
               TP + FP
```

**Example:** If the system flagged 20 jobs as fraudulent, and 18 of them were actually fraud while 2 were legitimate (false alarms), then:

```
Precision = 18 / (18 + 2) = 18 / 20 = 0.90 = 90%
```

**Significance in This Project:** High precision ensures that when the system warns a user that a job posting is a scam, the warning is reliable and not a false alarm. The multi-model approach (Text + Anomaly + Metadata) helps minimize false positives, ensuring users trust the system's results.

---

### 3. Recall (Sensitivity / True Positive Rate)

**Definition:** Recall answers the question: *"Out of all the truly fraudulent jobs in the dataset, how many did the system successfully detect?"* It measures the system's ability to catch all fraud cases.

**Formula:**

```
                  TP
Recall = ─────────────────
            TP + FN
```

**Example:** If there were 25 actual fraudulent jobs in the dataset and the system successfully detected 23 of them but missed 2, then:

```
Recall = 23 / (23 + 2) = 23 / 25 = 0.92 = 92%
```

**Significance in This Project:** In fraud detection, recall is extremely important because missing a fraudulent job (a False Negative) means a job seeker could fall victim to a scam. The Isolation Forest anomaly detection and NLP text analysis layers work together to maximize recall, ensuring that almost no scam goes undetected.

---

### 4. F1-Score (Harmonic Mean of Precision and Recall)

**Definition:** The F1-Score is the harmonic mean of Precision and Recall. It provides a single balanced metric that considers both false alarms (low precision) and missed detections (low recall). The F1-Score is especially useful when the dataset is imbalanced (e.g., 95% legitimate jobs and only 5% fraudulent jobs), where accuracy alone can be misleading.

**Formula:**

```
                    2 × Precision × Recall
F1-Score = ─────────────────────────────────
                  Precision + Recall
```

**Example:** If Precision = 0.90 (90%) and Recall = 0.92 (92%), then:

```
F1-Score = 2 × (0.90 × 0.92) / (0.90 + 0.92)
         = 2 × 0.828 / 1.82
         = 1.656 / 1.82
         = 0.91 = 91%
```

**Significance in This Project:** A strong F1-Score confirms that the system achieves a well-balanced performance — it neither generates too many false alarms on legitimate jobs, nor does it fail to catch real scams. This balance is critical for building user trust in the AI-powered fraud detection platform.

---

### Summary of Evaluation Metrics

| Metric | Formula | What It Measures |
|---|---|---|
| **Accuracy** | (TP + TN) / (TP + TN + FP + FN) | Overall correctness of all predictions |
| **Precision** | TP / (TP + FP) | Reliability of fraud alerts (fewer false alarms) |
| **Recall** | TP / (TP + FN) | Ability to catch all actual fraud cases |
| **F1-Score** | 2 × (Precision × Recall) / (Precision + Recall) | Balanced measure combining Precision and Recall |

The combination of all four metrics ensures a comprehensive evaluation of the system's performance in detecting recruitment fraud across different scenarios and dataset conditions.

---

## VII. Results
The proposed system was tested using different job postings to evaluate its performance in detecting recruitment fraud. The system successfully classified both legitimate and fraudulent job postings with high confidence.

For a legitimate job posting (Fullstack Developer – Uplers), the system generated a fraud score indicating Low Risk with 75% confidence. The analysis identified positive factors such as a realistic salary range, detailed job description, proper company information, and clearly defined requirements.

For another legitimate case (Turing platform), the system again classified the job as Low Risk, highlighting factors like standard technical requirements, valid company model, and absence of suspicious indicators.

In contrast, for a fraudulent job posting (Work From Home Data Entry), the system detected Critical Risk with around 92–95% confidence. The analysis flagged multiple fraud indicators such as:
- Unrealistically high salary for low effort
- No experience or skills required
- Urgency tactics like “apply immediately”
- Use of informal communication methods (WhatsApp)
- Lack of proper company details

The system also maintains an analysis history, where multiple job postings are stored with their risk levels (Low or Critical), confidence scores, and timestamps for future reference. Overall, the system demonstrates effective performance in distinguishing between genuine and fraudulent job postings by combining text analysis, anomaly detection, and metadata evaluation.

---

## VIII. Conclusion
The AI-Powered Recruitment Fraud Detection System developed in this project provides an effective solution for identifying fake job postings and protecting users from online scams. With the increase in fraudulent job advertisements, this system helps in quickly analyzing and verifying job authenticity.

The system uses multiple models to improve accuracy. The text analysis model detects suspicious keywords, the anomaly detection model identifies unusual patterns, and the metadata model checks details like salary, email, and company information. By combining these models, the system generates a fraud score and classifies jobs into different risk levels.

A key advantage of the system is that it provides clear explanations along with the fraud score, helping users understand the reason behind the result. The web-based interface makes it easy to use, allowing users to enter job details, view results, and download reports.

The system is designed in a modular way, making it easy to maintain and extend. Additional features like history tracking, dashboard visualization, and report generation improve usability. Testing shows that the system can accurately detect both genuine and fraudulent job postings.

In conclusion, this project offers a reliable and practical solution for recruitment fraud detection. In the future, it can be improved by using larger datasets and advanced deep learning models to further increase accuracy and performance.

---

## IX. References
[1] S. Vidros, C. Kolias, G. Kambourakis, and L. Akoglu, “Automatic Detection of Online Recruitment Frauds: Characteristics, Methods, and a Public Dataset,” Future Internet, vol. 9, no. 1, 2017.

[2] H. Afzal, F. Rustam, W. Aljedaani, M. A. Siddique, S. Ullah, and I. Ashraf, “Identifying Fake Job Posting Using Selective Features and Resampling Techniques,” Multimedia Tools and Applications, 2023.

[3] K. Taneja, J. Vashishtha, and S. Ratnoo, “Fraud-BERT: Transformer-Based Context-Aware Online Recruitment Fraud Detection,” Journal of Intelligent Information Systems, 2025.

[4] D. H. Vu, K. Nguyen, K. T. Tran, B. Vo, and T. Le, “Improving Fake Job Description Detection Using Deep Learning-Based NLP Techniques,” Applied Artificial Intelligence, 2024.

[5] J. Medapati, Y. Arradi, R. Kongala, S. Hariharan, J. Shanmugapriyan, and K. Natarajan, “Detection of Fake Online Recruitment Using Machine Learning Approach,” IEEE Conference, 2025.

[6] A. Mutemi and F. Bacao, “E-Commerce Fraud Detection Based on Machine Learning Techniques: A Systematic Review,” Big Data Mining and Analytics, 2023.

[7] R. Bounab, K. Zarour, B. Guelib, and N. Khlifa, “Enhancing Fraud Detection Through Machine Learning: Addressing Class Imbalance With SMOTE-ENN,” IEEE Access, 2024.

[8] I. D. Mienye and N. Jere, “Deep Learning for Credit Card Fraud Detection: A Review of Algorithms, Challenges, and Solutions,” IEEE Access, 2024.

[9] R. A. Alzahrani, M. Aljabri, R. Mustafa, and A. Mohammad, “Ad Click Fraud Detection Using Machine Learning and Deep Learning Algorithms,” IEEE Access, 2025.

[10] Mohammed et al., 2024 – Feature Selection for Cyber-Attack Detection.

[11] Karthik Reddy et al., 2025 – Deep Learning for Recruitment Fraud Detection.
