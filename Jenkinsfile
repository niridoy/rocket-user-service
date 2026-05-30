pipeline {
    agent any

    parameters {

        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'stg', 'prd'],
            description: 'Select environment'
        )

        string(
            name: 'SOURCE_REF',
            defaultValue: 'main',
            description: 'DEV/STG: branch or tag | PRD: only tag (v*)'
        )
    }

    environment {
        REGISTRY = "ghcr.io/niridoy/rocket-user-service"
        GIT_REPO = "https://github.com/niridoy/rocket-user-service.git"
    }

    stages {

        stage('🧹 Clean Workspace') {
            steps {
                deleteDir()
            }
        }

        stage('🧠 Validate Input & Prepare Context') {
            steps {
                script {

                    env.ENVIRONMENT = params.ENVIRONMENT
                    env.SOURCE_REF = params.SOURCE_REF

                    if (params.ENVIRONMENT == "prd") {

                        if (!params.SOURCE_REF.startsWith("v")) {
                            error("❌ PROD only allows tags starting with v (e.g. v1.0.0)")
                        }

                        env.SOURCE_TYPE = "tag"
                        env.IMAGE_TAG = params.SOURCE_REF
                        env.GIT_REF = params.SOURCE_REF

                        echo "🔴 PROD → TAG: ${SOURCE_REF}"

                    } else {

                        env.SOURCE_TYPE = params.SOURCE_REF.startsWith("v") ? "tag" : "branch"

                        def safeRef = params.SOURCE_REF.replaceAll("/", "-")

                        env.IMAGE_TAG = "${params.ENVIRONMENT}-${safeRef}-${BUILD_NUMBER}"
                        env.GIT_REF = params.SOURCE_REF

                        echo "🟢 ${params.ENVIRONMENT} → ${SOURCE_TYPE}: ${SOURCE_REF}"
                    }

                    env.IMAGE = "${REGISTRY}:${IMAGE_TAG}"
                }
            }
        }

        stage('📥 Checkout Code (SAFE REMOTE RESOLVE)') {
            steps {
                sh '''
                    echo "📥 Fetching repository..."

                    git init
                    git remote add origin $GIT_REPO
                    git fetch --all --tags

                    echo "🔍 Checking ref: $SOURCE_REF"

                    if git ls-remote --exit-code --heads origin $SOURCE_REF > /dev/null 2>&1; then
                        echo "✔ Branch found → checking out"
                        git checkout -b $SOURCE_REF origin/$SOURCE_REF

                    elif git ls-remote --exit-code --tags origin $SOURCE_REF > /dev/null 2>&1; then
                        echo "✔ Tag found → checking out"
                        git checkout tags/$SOURCE_REF

                    else
                        echo "❌ ERROR: Ref not found → $SOURCE_REF"
                        exit 1
                    fi
                '''
            }
        }

        stage('🏗️ Build Docker Image') {
            steps {
                sh '''
                    echo "🏗️ Building image: $IMAGE"
                    docker build -t $IMAGE .
                '''
            }
        }

        stage('🔐 Login & Push Image') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-creds',
                    usernameVariable: 'USER',
                    passwordVariable: 'TOKEN'
                )]) {

                    sh '''
                        echo $TOKEN | docker login ghcr.io -u $USER --password-stdin
                        docker push $IMAGE
                    '''
                }
            }
        }

        stage('🚀 GitOps Update & Create PR') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-creds',
                    usernameVariable: 'USER',
                    passwordVariable: 'TOKEN'
                )]) {

                    sh '''
                        rm -rf k8s-gitops
                        git clone https://$USER:$TOKEN@github.com/niridoy/k8s-gitops.git
                        cd k8s-gitops

                        BRANCH="${ENVIRONMENT}/user-service-${IMAGE_TAG}"
                        git checkout -b $BRANCH

                        FILE="user-service/overlays/${ENVIRONMENT}/patch.yaml"

                        echo "🔧 Updating image..."
                        sed -i "s|image: ghcr.io/niridoy/rocket-user-service:.*|image: ${IMAGE}|g" $FILE

                        git config user.name "jenkins"
                        git config user.email "jenkins@local"

                        git add .

                        if git diff --cached --quiet; then
                            echo "⚠️ No changes → skipping PR"
                            exit 0
                        fi

                        git commit -m "[${ENVIRONMENT}] user-service deploy ${IMAGE_TAG}"
                        git push origin $BRANCH

                        PR_TITLE="[${ENVIRONMENT}][User-Service][${SOURCE_TYPE}] Image Update ${IMAGE_TAG}"

                        PR_BODY=$(cat <<EOF
{
  "title": "${PR_TITLE}",
  "head": "$BRANCH",
  "base": "main",
  "body": "## 🚀 Deployment Summary\\n\\n- Environment: ${ENVIRONMENT}\\n- Source: ${SOURCE_REF}\\n- Type: ${SOURCE_TYPE}\\n- Image: ${IMAGE}\\n\\nAuto-generated by Jenkins CI/CD"
}
EOF
)

                        curl -s -X POST \
                          -H "Authorization: token $TOKEN" \
                          -H "Accept: application/vnd.github+json" \
                          https://api.github.com/repos/niridoy/k8s-gitops/pulls \
                          -d "$PR_BODY"

                        echo "✅ PR CREATED"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "=================================="
            echo "✅ SUCCESS"
            echo "ENV: ${ENVIRONMENT}"
            echo "SOURCE: ${SOURCE_REF}"
            echo "IMAGE: ${IMAGE}"
            echo "=================================="
        }

        failure {
            echo "=================================="
            echo "❌ FAILED PIPELINE"
            echo "ENV: ${params.ENVIRONMENT}"
            echo "SOURCE: ${params.SOURCE_REF}"
            echo "=================================="
        }
    }
}