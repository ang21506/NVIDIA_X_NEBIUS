import os
import json
from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.course import Course
from backend.app.models.topic import Topic, TopicPrerequisite, MasteryState
from backend.app.models.resource import Resource, ResourceChunk
from backend.app.models.assessment import QuizItem
from backend.app.services.auth_service import get_password_hash
from backend.app.services.embedding_service import EmbeddingService
from backend.app.services.planner_service import PlannerService
from backend.app.config import settings

SAMPLE_LECTURE_NOTES = """
LECTURE 4: EVALUATION OF CLASSIFICATION MODELS IN IMBALANCED DOMAINS
Department of Computer Science - Machine Learning Fundamentals (CS-401)
Instructor: Dr. E. Vance | Page 1-3

1. THE CONFUSION MATRIX AND CORE METRICS
In binary classification, predictions are evaluated against ground truth labels using a 2x2 confusion matrix:
- True Positives (TP): Correctly predicted positive instances.
- True Negatives (TN): Correctly predicted negative instances.
- False Positives (FP): Negative instances incorrectly flagged as positive (Type I error).
- False Negatives (FN): Positive instances incorrectly flagged as negative (Type II error).

Basic Metrics:
- Accuracy = (TP + TN) / (TP + TN + FP + FN)
- Precision = TP / (TP + FP)  (Fraction of positive predictions that are truly positive)
- Recall = TP / (TP + FN)     (Fraction of all actual positive instances that were captured)
- F1-Score = 2 * (Precision * Recall) / (Precision + Recall)

2. THE ACCURACY PARADOX AND CLASS IMBALANCE
A frequent conceptual mistake in machine learning is equating high overall classification accuracy with high recall for minority classes. 
Consider an automated fraud detection system operating on a transaction dataset of 1,000 samples:
- Actual Legitimate Transactions (Majority Class): 990 samples (99%)
- Actual Fraudulent Transactions (Minority Class): 10 samples (1%)

If a naive model predicts EVERY transaction as 'Legitimate':
- TP = 0 (Caught 0 fraud cases)
- TN = 990 (All legitimate correctly classified)
- FP = 0
- FN = 10 (All fraud transactions missed)

Overall Accuracy = (0 + 990) / 1000 = 99.0%
Recall for Fraud = 0 / (0 + 10) = 0.0%

Notice that despite achieving an exceptional 99% accuracy, the model provides zero utility for its primary objective: stopping fraud. Therefore, in any imbalanced domain (medical screening, cybersecurity, defect detection), accuracy is profoundly misleading.

3. REMEDIATION STRATEGIES
To address class imbalance:
- Measure Recall, Precision, PR-AUC, and Balanced Accuracy instead of plain accuracy.
- Resample training data (SMOTE, random oversampling, or cluster-based undersampling).
- Adjust classification thresholds on posterior probabilities rather than using default 0.5.
- Apply cost-sensitive loss penalties weighting False Negatives higher than False Positives.
"""

class SeedService:
    @classmethod
    def seed_demo_data(cls, db: Session) -> User:
        # Check if demo user already exists
        demo_user = db.query(User).filter(User.email == "demo@learnloop.ai").first()
        if not demo_user:
            demo_user = User(
                email="demo@learnloop.ai",
                hashed_password=get_password_hash("learnloop2026"),
                full_name="Alex Chen (Demo Student)",
                timezone="America/New_York",
                is_active=True,
                is_demo=True,
            )
            db.add(demo_user)
            db.flush()

        # Seed Course
        course = db.query(Course).filter(Course.user_id == demo_user.id, Course.code == "CS-401").first()
        if not course:
            course = Course(
                user_id=demo_user.id,
                title="Machine Learning Fundamentals",
                code="CS-401",
                description="Core concepts of supervised machine learning, model evaluation metrics, decision trees, and generalization.",
                exam_date=date.today() + timedelta(days=14),
                learning_objectives="Understand precision, recall, F1-score, ROC-AUC, confusion matrices, bias-variance tradeoff, and overfitting.",
                available_hours_per_week=12,
            )
            db.add(course)
            db.flush()

        # Seed Topics
        topic_defs = [
            ("Classification Metrics & Confusion Matrices", "Basic terms: TP, TN, FP, FN, precision and accuracy.", 0),
            ("Precision, Recall & Imbalanced Classes", "The accuracy paradox, trade-offs in imbalanced datasets.", 1),
            ("Decision Trees & Information Gain", "Splitting criteria, entropy, Gini impurity, and tree induction.", 2),
            ("Overfitting, Regularization & Generalization", "Bias-variance tradeoff, pruning, cross-validation.", 3),
        ]

        topics: Dict[str, Topic] = {}
        for title, desc, idx in topic_defs:
            t = db.query(Topic).filter(Topic.course_id == course.id, Topic.title == title).first()
            if not t:
                t = Topic(
                    course_id=course.id,
                    user_id=demo_user.id,
                    title=title,
                    description=desc,
                    order_index=idx,
                )
                db.add(t)
                db.flush()
            topics[title] = t

        # Seed Prerequisites
        t1 = topics["Classification Metrics & Confusion Matrices"]
        t2 = topics["Precision, Recall & Imbalanced Classes"]
        t3 = topics["Decision Trees & Information Gain"]
        t4 = topics["Overfitting, Regularization & Generalization"]

        for parent, child in [(t1, t2), (t3, t4)]:
            existing_prereq = (
                db.query(TopicPrerequisite)
                .filter(TopicPrerequisite.topic_id == child.id, TopicPrerequisite.prerequisite_topic_id == parent.id)
                .first()
            )
            if not existing_prereq:
                db.add(TopicPrerequisite(topic_id=child.id, prerequisite_topic_id=parent.id))

        # Seed initial topic masteries
        for title, topic in topics.items():
            mastery = (
                db.query(MasteryState)
                .filter(MasteryState.user_id == demo_user.id, MasteryState.topic_id == topic.id)
                .first()
            )
            if not mastery:
                initial_score = 0.65 if title == t1.title else (0.25 if title == t2.title else 0.40)
                mastery = MasteryState(
                    user_id=demo_user.id,
                    topic_id=topic.id,
                    mastery_score=initial_score,
                    confidence_score=0.40,
                    evidence_count=2,
                    correct_count=1,
                    total_count=2,
                    last_assessed_at=datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=2),
                )
                db.add(mastery)

        # Seed Sample Lecture Notes Resource
        resource = (
            db.query(Resource)
            .filter(Resource.user_id == demo_user.id, Resource.course_id == course.id, Resource.filename == "lecture_4_metrics_imbalanced.txt")
            .first()
        )
        if not resource:
            sample_file_path = os.path.join(settings.UPLOAD_DIR, "lecture_4_metrics_imbalanced.txt")
            with open(sample_file_path, "w", encoding="utf-8") as f:
                f.write(SAMPLE_LECTURE_NOTES.strip())

            resource = Resource(
                user_id=demo_user.id,
                course_id=course.id,
                filename="lecture_4_metrics_imbalanced.txt",
                file_path=sample_file_path,
                file_size=len(SAMPLE_LECTURE_NOTES),
                mime_type="text/plain",
                page_count=3,
                status="INDEXED",
            )
            db.add(resource)
            db.flush()

            # Index sample chunks
            paragraphs = [p.strip() for p in SAMPLE_LECTURE_NOTES.strip().split("\n\n") if p.strip()]
            for p_idx, para in enumerate(paragraphs):
                emb = EmbeddingService.get_embedding(para)
                chunk = ResourceChunk(
                    resource_id=resource.id,
                    user_id=demo_user.id,
                    course_id=course.id,
                    chunk_index=p_idx,
                    page_number=min(3, (p_idx // 2) + 1),
                    content=para,
                    token_count=len(para.split()),
                    embedding_json=json.dumps(emb),
                    embedding=emb,
                    embedding_model=EmbeddingService.model_id(),
                    embedding_dimension=len(emb),
                )
                db.add(chunk)

        # Seed Diagnostic Quiz Items (including demonstration trigger & re-test item)
        existing_items = db.query(QuizItem).filter(QuizItem.course_id == course.id).count()
        if existing_items == 0:
            quiz_items_data = [
                {
                    "topic_id": t2.id,
                    "question": "A model achieves 98% accuracy on a fraud detection dataset where 99% of samples are legitimate. Does this model necessarily have high recall for fraud cases?",
                    "options": [
                        "Yes, 98% accuracy guarantees high recall across all classes.",
                        "No, the model could predict all samples as legitimate and still achieve 99% accuracy while having 0% recall for fraud.",
                        "Yes, because accuracy and recall are always proportional.",
                        "No, but only if the decision boundary is non-linear."
                    ],
                    "correct_answer": "No, the model could predict all samples as legitimate and still achieve 99% accuracy while having 0% recall for fraud.",
                    "explanation": "In imbalanced datasets, overall accuracy is dominated by the majority class. A trivial classifier predicting the majority class for all samples can achieve high accuracy (e.g. 99%) while failing to catch any positive minority instances (recall = 0%).",
                    "difficulty": "medium",
                    "target_misconception": "Belief that high overall accuracy guarantees high recall for minority classes in imbalanced datasets."
                },
                {
                    "topic_id": t2.id,
                    "question": "Suppose a cancer screening test has 95% overall accuracy on a population where only 1% has cancer. If the model fails to detect any actual cancer cases, what is its recall for cancer?",
                    "options": [
                        "95%",
                        "0%",
                        "5%",
                        "50%"
                    ],
                    "correct_answer": "0%",
                    "explanation": "Recall = TP / (TP + FN). Since 0 actual cancer cases were detected, TP = 0, so Recall = 0 / (0 + FN) = 0%. High overall accuracy cannot compensate for zero true positives in the minority class.",
                    "difficulty": "medium",
                    "target_misconception": "Belief that high overall accuracy guarantees high recall for minority classes in imbalanced datasets."
                },
                {
                    "topic_id": t1.id,
                    "question": "Which cell in a binary confusion matrix represents a healthy patient incorrectly diagnosed as having a disease?",
                    "options": [
                        "True Positive (TP)",
                        "False Negative (FN)",
                        "False Positive (FP - Type I Error)",
                        "True Negative (TN)"
                    ],
                    "correct_answer": "False Positive (FP - Type I Error)",
                    "explanation": "A False Positive occurs when the ground truth is negative (healthy) but the predictive model asserts positive (has disease).",
                    "difficulty": "easy",
                    "target_misconception": None
                },
                {
                    "topic_id": t3.id,
                    "question": "In decision tree learning, what does Entropy measure about a distribution of class labels at a node?",
                    "options": [
                        "The computational speed of calculating splits",
                        "The impurity or degree of disorder in the sample distribution",
                        "The total depth of the decision tree",
                        "The number of leaf nodes"
                    ],
                    "correct_answer": "The impurity or degree of disorder in the sample distribution",
                    "explanation": "Entropy quantifies the average information or unpredictability. Zero entropy indicates a completely pure node with a single class.",
                    "difficulty": "easy",
                    "target_misconception": None
                },
                {
                    "topic_id": t4.id,
                    "question": "What is the primary consequence of growing a fully deep decision tree without any pruning or leaf constraints?",
                    "options": [
                        "High bias on training data and low variance on test data",
                        "High variance and overfitting to noise in the training set",
                        "Linear decision boundaries",
                        "Underfitting due to insufficient tree capacity"
                    ],
                    "correct_answer": "High variance and overfitting to noise in the training set",
                    "explanation": "Unconstrained trees can memorize training noise perfectly (100% training accuracy, zero bias), leading to extreme variance and degraded generalization on unseen test data.",
                    "difficulty": "medium",
                    "target_misconception": None
                }
            ]

            for q in quiz_items_data:
                db.add(
                    QuizItem(
                        user_id=demo_user.id,
                        course_id=course.id,
                        topic_id=q["topic_id"],
                        question=q["question"],
                        options_json=json.dumps(q["options"]),
                        correct_answer=q["correct_answer"],
                        explanation=q["explanation"],
                        difficulty=q["difficulty"],
                        target_misconception=q["target_misconception"],
                    )
                )

        # Recalculate initial study plan
        PlannerService.recalculate_course_plan(db, demo_user.id, course.id)
        db.commit()
        return demo_user
