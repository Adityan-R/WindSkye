const { execSync } = require('child_process');
const fs = require('fs');

const GRAPHIC_EMOJI_REGEX = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}]/gu;

function replaceEmojisInString(str) {
  if (!str) return '';
  return str.replace(GRAPHIC_EMOJI_REGEX, '').trim();
}

try {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString('utf8').trim();

  // Safe split using a very unique string separator
  const commitsStr = execSync('git log --reverse --format="%H::::%s::::%b|||---END_COMMIT---|||"').toString('utf8');
  const commits = commitsStr.split('|||---END_COMMIT---|||').filter(c => c.trim().length > 0).map(block => {
    const parts = block.trim().split('::::');
    return { hash: parts[0].trim(), msg: parts[1], body: parts[2] || '' };
  });

  console.log(`Found ${commits.length} commits to process.`);

  execSync('git checkout --orphan temp_rewrite');
  
  for (let i = 0; i < commits.length; i++) {
    const { hash, msg, body } = commits[i];
    console.log(`Processing ${i + 1}/${commits.length}: ${hash}`);
    
    execSync('git rm -rf . || true');
    execSync('git clean -fdx -e rewrite.cjs -e find-emojis.cjs -e rewrite-msg.cjs');
    
    execSync(`git read-tree -um ${hash}`);
    execSync('git add -A');
    
    const newMsg = replaceEmojisInString(msg);
    const newBody = replaceEmojisInString(body);
    const fullMsg = newBody ? `${newMsg}\n\n${newBody}` : newMsg;
    
    fs.writeFileSync('.git_commit_msg.txt', fullMsg, 'utf8');
    
    const authorName = execSync(`git log -1 --format="%an" ${hash}`).toString('utf8').trim();
    const authorEmail = execSync(`git log -1 --format="%ae" ${hash}`).toString('utf8').trim();
    const authorDate = execSync(`git log -1 --format="%ad" ${hash}`).toString('utf8').trim();
    
    execSync(`git commit -F .git_commit_msg.txt --allow-empty`, {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: authorName,
        GIT_AUTHOR_EMAIL: authorEmail,
        GIT_AUTHOR_DATE: authorDate,
        GIT_COMMITTER_NAME: authorName,
        GIT_COMMITTER_EMAIL: authorEmail,
        GIT_COMMITTER_DATE: authorDate,
      }
    });
  }

  execSync(`git checkout ${currentBranch}`);
  execSync('git reset --hard temp_rewrite');
  execSync('git branch -D temp_rewrite');
  console.log("Message Rewrite complete!");
} catch (e) {
  console.error("Error:", e.message);
  if (e.stdout) console.error("STDOUT:", e.stdout.toString());
  if (e.stderr) console.error("STDERR:", e.stderr.toString());
}
