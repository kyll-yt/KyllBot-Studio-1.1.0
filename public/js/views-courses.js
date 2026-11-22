'use strict';

/* ------------------------------------------------------------------ */
/* vue : liste des formations                                          */
/* ------------------------------------------------------------------ */

function courseAverage(courseId) {
  const learners = state.ws.learners.filter((learner) => learner.courseId === courseId);
  if (!learners.length) return 0;
  return Math.round(learners.reduce((sum, learner) => sum + learner.progress, 0) / learners.length);
}

function courseHelpPanel() {
  return `<div class="panel info-panel">
    <div class="info-head">
      <span class="info-ic">${icon('book')}</span>
      <div>
        <h3>À quoi sert le côté Formation ?</h3>
        <p>Un parcours mesurable pour votre communauté : modules, leçons, quiz, progression réelle et certificats.</p>
      </div>
      <button class="btn btn-ghost btn-sm" data-action="course-help">En savoir plus</button>
    </div>
    <div class="info-grid">
      <div><b>Onboarder</b><p>Accueillir les nouveaux membres avec les règles, les rôles et un quiz de validation.</p></div>
      <div><b>Former une équipe</b><p>Documenter les procédures internes, la modération et les bonnes pratiques.</p></div>
      <div><b>Certifier</b><p>Attribuer un certificat automatique aux apprenants qui atteignent 100 %.</p></div>
      <div><b>Suivre et relancer</b><p>Voir la progression réelle par apprenant et envoyer des rappels via le bot.</p></div>
    </div>
  </div>`;
}

function viewCourses() {
  const query = state.search.toLowerCase();
  const courses = state.ws.courses.filter(
    (course) => !query || `${course.title} ${course.description} ${course.category}`.toLowerCase().includes(query),
  );

  const cards = courses
    .map((course) => {
      const lessons = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
      const learners = state.ws.learners.filter((learner) => learner.courseId === course.id).length;
      const avg = courseAverage(course.id);
      return `<article class="course-card">
        <div class="course-cover c${course.cover % 4}">
          <span class="cc-badge">${esc(course.category)}</span>
        </div>
        <div class="course-body">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">
            ${statusPill(course.status)}
            <span class="pill gray">${esc(course.level)}</span>
          </div>
          <h3>${esc(course.title)}</h3>
          <p>${esc(course.description || 'Aucune description pour cette formation.')}</p>
          <div class="course-stats">
            <span>${course.modules.length} modules</span>
            <span>${lessons} leçons</span>
            <span>${learners} apprenants</span>
          </div>
          <div class="course-foot">
            <div class="progress"><i style="width:${avg}%"></i></div>
            <span style="font-size:11px;color:var(--muted-2);min-width:34px;text-align:right">${avg}%</span>
          </div>
          <div class="bot-actions" style="margin-top:14px">
            <a class="btn btn-ghost btn-sm" href="#/courses/${esc(course.id)}">Ouvrir l'éditeur</a>
            <button class="mini-btn danger" data-action="delete-course" data-id="${esc(course.id)}" title="Supprimer" style="width:34px;height:34px">${icon('trash')}</button>
          </div>
        </div>
      </article>`;
    })
    .join('');

  return `<div class="page-head">
      <div>
        <h1>Formations</h1>
        <p class="sub">Modules, leçons et quiz : composez des parcours mesurables.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-ghost" href="#/templates">${icon('template')} Partir d'un modèle</a>
        <button class="btn btn-primary" data-action="new-course">${icon('plus')} Nouvelle formation</button>
      </div>
    </div>
    ${courseHelpPanel()}
    ${
      courses.length
        ? `<div class="course-grid">${cards}</div>`
        : emptyState('Aucune formation', 'Créez un parcours ou dupliquez un modèle prêt à l’emploi.', 'Créer une formation', 'new-course')
    }`;
}

/* ------------------------------------------------------------------ */
/* vue : éditeur de formation                                          */
/* ------------------------------------------------------------------ */

const LESSON_TYPES = {
  video: { label: 'Vidéo', icon: 'video' },
  text: { label: 'Texte', icon: 'file' },
  quiz: { label: 'Quiz', icon: 'quiz' },
  live: { label: 'Classe live', icon: 'users' },
};

function viewCourseDetail(id) {
  const course = state.ws.courses.find((entry) => entry.id === id);
  if (!course) return emptyState('Formation introuvable', 'Cette formation a peut-être été supprimée.', 'Retour aux formations', 'go-courses');

  const lessonsCount = course.modules.reduce((sum, module) => sum + module.lessons.length, 0);
  const learners = state.ws.learners.filter((learner) => learner.courseId === course.id);
  const avg = courseAverage(course.id);

  const modules = course.modules
    .map(
      (module) => `<div class="module">
        <div class="module-head">
          <span style="color:var(--muted-2)">${icon('template')}</span>
          <h4>${esc(module.title)}</h4>
          <span class="pill gray">${module.lessons.length} leçon(s)</span>
          <button class="mini-btn" data-action="new-lesson" data-id="${esc(course.id)}" data-module="${esc(module.id)}" title="Ajouter une leçon">${icon('plus')}</button>
          <button class="mini-btn" data-action="edit-module" data-id="${esc(course.id)}" data-module="${esc(module.id)}" title="Renommer">${icon('edit')}</button>
          <button class="mini-btn danger" data-action="delete-module" data-id="${esc(course.id)}" data-module="${esc(module.id)}" title="Supprimer">${icon('trash')}</button>
        </div>
        ${
          module.lessons.length
            ? module.lessons
                .map(
                  (lesson) => `<div class="lesson-row">
                    <span class="lt">${icon(LESSON_TYPES[lesson.type]?.icon || 'file')}</span>
                    <div class="lm"><b>${esc(lesson.title)}</b><span>${esc(LESSON_TYPES[lesson.type]?.label || 'Leçon')} · ${lesson.duration} min</span></div>
                    <div class="la">
                      <button class="mini-btn" data-action="edit-lesson" data-id="${esc(course.id)}" data-module="${esc(module.id)}" data-lesson="${esc(lesson.id)}" title="Modifier">${icon('edit')}</button>
                      <button class="mini-btn danger" data-action="delete-lesson" data-id="${esc(course.id)}" data-module="${esc(module.id)}" data-lesson="${esc(lesson.id)}" title="Supprimer">${icon('trash')}</button>
                    </div>
                  </div>`,
                )
                .join('')
            : '<div class="lesson-row" style="color:var(--muted-2);font-size:12px">Aucune leçon. Ajoutez la première.</div>'
        }
      </div>`,
    )
    .join('');

  const quiz = course.quiz
    .map(
      (question, index) => `<div class="quiz-item">
        <div style="display:flex;gap:8px;align-items:flex-start">
          <h4 style="flex:1">${index + 1}. ${esc(question.question)}</h4>
          <button class="mini-btn danger" data-action="delete-question" data-id="${esc(course.id)}" data-question="${esc(question.id)}" title="Supprimer">${icon('trash')}</button>
        </div>
        ${question.options
          .map(
            (option, optionIndex) => `<div class="quiz-opt ${optionIndex === question.answer ? 'correct' : ''}">
              <span class="qo">${optionIndex === question.answer ? '✓' : String.fromCharCode(65 + optionIndex)}</span>
              ${esc(option)}
            </div>`,
          )
          .join('')}
      </div>`,
    )
    .join('');

  return `<a class="back-link" href="#/courses">${icon('arrowLeft')} Retour aux formations</a>
    <div class="page-head">
      <div>
        <h1 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${esc(course.title)} ${statusPill(course.status)}</h1>
        <p class="sub">${esc(course.description || 'Aucune description.')}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-ghost" data-action="export-course" data-id="${esc(course.id)}">${icon('download')} Exporter</button>
        <button class="btn ${course.status === 'published' ? 'btn-ghost' : 'btn-primary'}" data-action="toggle-course-status" data-id="${esc(course.id)}">
          ${course.status === 'published' ? 'Dépublier' : 'Publier la formation'}
        </button>
      </div>
    </div>

    <div class="grid-stats" style="margin-bottom:16px">
      ${statCard('Modules', String(course.modules.length), `${lessonsCount} leçons`, 'template')}
      ${statCard('Apprenants', fmt(learners.length), 'inscrits à ce parcours', 'users')}
      ${statCard('Progression moyenne', `${avg} %`, `${learners.filter((l) => l.progress === 100).length} certifié(s)`, 'chart')}
      ${statCard('Questions du quiz', String(course.quiz.length), `${course.quiz.reduce((s, q) => s + q.points, 0)} points`, 'quiz')}
    </div>

    <div class="dash-grid">
      <div>
        <div class="panel">
          <div class="panel-head">
            <h3>Programme</h3>
            <div class="ph-actions"><button class="btn btn-primary btn-sm" data-action="new-module" data-id="${esc(course.id)}">${icon('plus')} Module</button></div>
          </div>
          <div class="panel-body" style="padding:16px">
            ${modules || '<p style="font-size:12.5px;color:var(--muted-2)">Aucun module pour le moment.</p>'}
          </div>
        </div>
      </div>
      <div>
        <div class="panel">
          <div class="panel-head">
            <h3>Quiz final</h3>
            <div class="ph-actions"><button class="btn btn-ghost btn-sm" data-action="new-question" data-id="${esc(course.id)}">${icon('plus')} Question</button></div>
          </div>
          <div class="panel-body">
            ${quiz || '<p style="font-size:12.5px;color:var(--muted-2)">Aucune question. Ajoutez une évaluation pour certifier vos apprenants.</p>'}
          </div>
        </div>

        <div class="panel" style="margin-top:14px">
          <div class="panel-head"><h3>Informations</h3></div>
          <div class="panel-body">
            <div class="setting-row"><div class="sr-main"><h4>Catégorie</h4><p>${esc(course.category)}</p></div></div>
            <div class="setting-row"><div class="sr-main"><h4>Niveau</h4><p>${esc(course.level)}</p></div></div>
            <div class="setting-row"><div class="sr-main"><h4>Créée</h4><p>${esc(new Date(course.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }))}</p></div></div>
            <div class="setting-row" style="border-bottom:0;padding-bottom:0">
              <div class="sr-main"><h4>Apprenants</h4><p>${learners.length} inscrit(s) · ${avg} % de progression</p></div>
              <a class="btn btn-ghost btn-sm" href="#/learners">Gérer</a>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ */
/* vue : apprenants                                                    */
/* ------------------------------------------------------------------ */

function viewLearners() {
  const query = state.search.toLowerCase();
  const learners = state.ws.learners.filter(
    (learner) => !query || `${learner.name} ${learner.email}`.toLowerCase().includes(query),
  );

  const rows = learners
    .map((learner) => {
      const course = state.ws.courses.find((entry) => entry.id === learner.courseId);
      return `<tr>
        <td>
          <div class="cell-user">
            <span class="avatar" style="width:30px;height:30px;border-radius:9px;font-size:10.5px">${esc(initials(learner.name))}</span>
            <div><b>${esc(learner.name)}</b><span style="display:flex;align-items:center;gap:6px">${esc(learner.email)}${learner.hasAccount ? '<span class="pill cyan">Compte lié</span>' : '<span class="pill gray">Pas encore de compte</span>'}</span></div>
          </div>
        </td>
        <td>${esc(course?.title || '—')}</td>
        <td style="min-width:140px">
          <div style="display:flex;align-items:center;gap:9px">
            <div class="progress ${learner.progress === 100 ? 'green' : ''}" style="flex:1"><i style="width:${learner.progress}%"></i></div>
            <span style="font-size:11px;color:var(--muted-2)">${learner.progress}%</span>
          </div>
        </td>
        <td><span class="pill ${learner.score >= 80 ? 'green' : learner.score >= 60 ? 'violet' : 'gray'}">${learner.score} / 100</span></td>
        <td style="color:var(--muted-2);font-size:11.5px">${esc(timeAgo(learner.lastActive))}</td>
        <td>
          <div style="display:flex;gap:4px;justify-content:flex-end">
            ${learner.hasAccount ? '' : `<button class="mini-btn" data-action="check-learner" data-id="${esc(learner.id)}" title="Vérifier le compte">${icon('check')}</button>`}
            <button class="mini-btn" data-action="edit-learner" data-id="${esc(learner.id)}" title="Modifier">${icon('edit')}</button>
            <button class="mini-btn danger" data-action="delete-learner" data-id="${esc(learner.id)}" title="Retirer">${icon('trash')}</button>
          </div>
        </td>
      </tr>`;
    })
    .join('');

  return `<div class="page-head">
      <div>
        <h1>Apprenants</h1>
        <p class="sub">Suivez la progression, les scores et la dernière activité de chaque apprenant.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" data-action="new-learner">${icon('plus')} Inscrire un apprenant</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-head">
        <h3>${learners.length} apprenant(s)</h3>
        <div class="ph-actions"><span class="pill violet">${state.stats.certificates} certificat(s) délivré(s)</span></div>
      </div>
      ${
        learners.length
          ? `<div class="table-wrap"><table class="table">
              <thead><tr><th>Apprenant</th><th>Formation</th><th>Progression</th><th>Score</th><th>Dernière activité</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`
          : emptyState('Aucun apprenant', 'Inscrivez votre premier apprenant pour suivre sa progression.', 'Inscrire un apprenant', 'new-learner')
      }
    </div>`;
}

/* ------------------------------------------------------------------ */
/* modales & actions : formations                                      */
/* ------------------------------------------------------------------ */

onAction('course-help', () => {
  openModal({
    title: 'Le côté Formation, concrètement',
    subtitle: 'Un parcours structuré, mesuré et automatisé.',
    submitLabel: 'Fermer',
    body: `
      <div class="help-block">
        <h4>1. Structurer</h4>
        <p>Créez des modules et des leçons. Chaque leçon peut contenir du texte, une vidéo ou un exercice.</p>
      </div>
      <div class="help-block">
        <h4>2. Vérifier</h4>
        <p>Ajoutez un quiz. Le score est enregistré par apprenant et la progression est calculée à partir des leçons terminées.</p>
      </div>
      <div class="help-block">
        <h4>3. Certifier</h4>
        <p>À 100 %, le studio génère un certificat vérifiable. Pratique pour les formations internes ou les parcours clients.</p>
      </div>
      <div class="help-block">
        <h4>4. Automatiser</h4>
        <p>Le bot peut accueillir les apprenants, envoyer les rappels et attribuer un rôle Discord à la fin du parcours.</p>
      </div>
      <p class="hint">Les statistiques affichées sont calculées à partir des vraies inscriptions et des vrais scores. Aucune donnée de démonstration n’est ajoutée.</p>
    `,
    onSubmit: () => {},
  });
});

onAction('new-course', () => {
  openModal({
    title: 'Nouvelle formation',
    subtitle: 'Vous pourrez ajouter vos modules et votre quiz ensuite.',
    submitLabel: 'Créer la formation',
    body: `
      <div class="field"><label for="ncTitle">Titre</label><input class="input" id="ncTitle" name="title" placeholder="Créer son premier bot Discord" required></div>
      <div class="field"><label for="ncDesc">Description</label><textarea class="textarea" id="ncDesc" name="description" placeholder="Ce que vos apprenants sauront faire à la fin."></textarea></div>
      <div class="form-row">
        <div class="field"><label for="ncCat">Catégorie</label><input class="input" id="ncCat" name="category" placeholder="Discord, Pédagogie…"></div>
        <div class="field"><label for="ncLevel">Niveau</label>
          <select class="select" id="ncLevel" name="level">
            <option>Débutant</option><option>Intermédiaire</option><option>Avancé</option>
          </select>
        </div>
      </div>
    `,
    onSubmit: async (formData) => {
      const data = await api('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          category: formData.get('category'),
          level: formData.get('level'),
        }),
      });
      await refresh();
      toast('Formation créée.');
      window.location.hash = `#/courses/${data.course.id}`;
    },
  });
});

onAction('delete-course', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  if (!course) return;
  confirmDialog({
    title: `Supprimer « ${course.title} » ?`,
    message: 'La formation, ses modules et les inscriptions associées seront supprimés définitivement.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/courses/${course.id}`, { method: 'DELETE' });
      if (state.route.name === 'course') window.location.hash = '#/courses';
      await refresh();
      toast('Formation supprimée.', 'info');
    },
  });
});

onAction('toggle-course-status', async (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  if (!course) return;
  const next = course.status === 'published' ? 'draft' : 'published';
  await api(`/api/courses/${course.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
  await refresh();
  toast(next === 'published' ? 'Formation publiée : vos apprenants y ont accès.' : 'Formation repassée en brouillon.', 'info');
});

onAction('go-courses', () => {
  window.location.hash = '#/courses';
});

onAction('export-course', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  if (!course) return;
  const payload = {
    format: 'kyllbot-course-v1',
    exportedAt: new Date().toISOString(),
    course: {
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      modules: course.modules,
      quiz: course.quiz,
    },
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${course.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  toast('Export téléchargé (compatible SCORM / xAPI après mapping).', 'info');
});

onAction('new-module', (el) => {
  const courseId = el.dataset.id;
  openModal({
    title: 'Nouveau module',
    submitLabel: 'Ajouter le module',
    body: `<div class="field"><label for="mTitle">Titre du module</label><input class="input" id="mTitle" name="title" placeholder="Module 2 — Commandes" required></div>`,
    onSubmit: async (formData) => {
      await api(`/api/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify({ title: formData.get('title') }) });
      await refresh();
      toast('Module ajouté.');
    },
  });
});

onAction('edit-module', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  const module = course?.modules.find((entry) => entry.id === el.dataset.module);
  if (!course || !module) return;
  openModal({
    title: 'Renommer le module',
    submitLabel: 'Enregistrer',
    body: `<div class="field"><label for="mTitle">Titre du module</label><input class="input" id="mTitle" name="title" value="${esc(module.title)}" required></div>`,
    onSubmit: async (formData) => {
      await api(`/api/courses/${course.id}/modules/${module.id}`, { method: 'PATCH', body: JSON.stringify({ title: formData.get('title') }) });
      await refresh();
      toast('Module renommé.');
    },
  });
});

onAction('delete-module', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  const module = course?.modules.find((entry) => entry.id === el.dataset.module);
  if (!course || !module) return;
  confirmDialog({
    title: 'Supprimer ce module ?',
    message: `« ${module.title} » et ses ${module.lessons.length} leçon(s) seront supprimés.`,
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/courses/${course.id}/modules/${module.id}`, { method: 'DELETE' });
      await refresh();
      toast('Module supprimé.', 'info');
    },
  });
});

function lessonModal(courseId, moduleId, lesson) {
  const value = lesson || { title: '', type: 'text', duration: 10, content: '' };
  openModal({
    title: lesson ? 'Modifier la leçon' : 'Nouvelle leçon',
    submitLabel: lesson ? 'Enregistrer' : 'Ajouter la leçon',
    body: `
      <div class="field"><label for="lTitle">Titre</label><input class="input" id="lTitle" name="title" value="${esc(value.title)}" placeholder="Anatomie d’un bot Discord" required></div>
      <div class="form-row">
        <div class="field"><label for="lType">Type</label>
          <select class="select" id="lType" name="type">
            ${Object.entries(LESSON_TYPES).map(([key, meta]) => `<option value="${key}" ${value.type === key ? 'selected' : ''}>${meta.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label for="lDuration">Durée (minutes)</label><input class="input" id="lDuration" name="duration" type="number" min="1" max="600" value="${esc(value.duration)}"></div>
      </div>
      <div class="field"><label for="lContent">Contenu / notes</label><textarea class="textarea" id="lContent" name="content" placeholder="Points clés, script vidéo, ressources…">${esc(value.content)}</textarea></div>
    `,
    onSubmit: async (formData) => {
      const payload = {
        title: formData.get('title'),
        type: formData.get('type'),
        duration: Number(formData.get('duration')),
        content: formData.get('content'),
      };
      if (lesson) {
        await api(`/api/courses/${courseId}/modules/${moduleId}/lessons/${lesson.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await api(`/api/courses/${courseId}/modules/${moduleId}/lessons`, { method: 'POST', body: JSON.stringify(payload) });
      }
      await refresh();
      toast(lesson ? 'Leçon mise à jour.' : 'Leçon ajoutée.');
    },
  });
}

onAction('new-lesson', (el) => lessonModal(el.dataset.id, el.dataset.module));

onAction('edit-lesson', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  const module = course?.modules.find((entry) => entry.id === el.dataset.module);
  const lesson = module?.lessons.find((entry) => entry.id === el.dataset.lesson);
  if (course && module && lesson) lessonModal(course.id, module.id, lesson);
});

onAction('delete-lesson', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  const module = course?.modules.find((entry) => entry.id === el.dataset.module);
  const lesson = module?.lessons.find((entry) => entry.id === el.dataset.lesson);
  if (!course || !module || !lesson) return;
  confirmDialog({
    title: `Supprimer « ${lesson.title} » ?`,
    message: 'La leçon sera retirée du programme.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/courses/${course.id}/modules/${module.id}/lessons/${lesson.id}`, { method: 'DELETE' });
      await refresh();
      toast('Leçon supprimée.', 'info');
    },
  });
});

onAction('new-question', (el) => {
  const courseId = el.dataset.id;
  openModal({
    title: 'Nouvelle question',
    subtitle: 'Ajoutez jusqu’à 4 réponses et indiquez la bonne.',
    submitLabel: 'Ajouter la question',
    body: `
      <div class="field"><label for="qText">Question</label><textarea class="textarea" id="qText" name="question" placeholder="Que faut-il garder secret ?" required></textarea></div>
      <div class="field"><label>Réponses</label>
        <input class="input" name="option1" placeholder="Réponse A" style="margin-bottom:7px">
        <input class="input" name="option2" placeholder="Réponse B" style="margin-bottom:7px">
        <input class="input" name="option3" placeholder="Réponse C (optionnel)" style="margin-bottom:7px">
        <input class="input" name="option4" placeholder="Réponse D (optionnel)">
      </div>
      <div class="form-row">
        <div class="field"><label for="qAnswer">Bonne réponse</label>
          <select class="select" id="qAnswer" name="answer">
            <option value="1">A</option><option value="2">B</option><option value="3">C</option><option value="4">D</option>
          </select>
        </div>
        <div class="field"><label for="qPoints">Points</label><input class="input" id="qPoints" name="points" type="number" min="1" max="10" value="1"></div>
      </div>
    `,
    onSubmit: async (formData) => {
      const options = [1, 2, 3, 4].map((index) => String(formData.get(`option${index}`) || '').trim()).filter(Boolean);
      const answer = Number(formData.get('answer')) - 1;
      if (options.length < 2) throw new Error('Ajoutez au moins deux réponses.');
      if (answer >= options.length) throw new Error('La bonne réponse doit correspondre à une réponse remplie.');
      await api(`/api/courses/${courseId}/quiz`, {
        method: 'POST',
        body: JSON.stringify({ question: formData.get('question'), options, answer, points: Number(formData.get('points')) }),
      });
      await refresh();
      toast('Question ajoutée.');
    },
  });
});

onAction('delete-question', (el) => {
  const course = state.ws.courses.find((entry) => entry.id === el.dataset.id);
  const question = course?.quiz.find((entry) => entry.id === el.dataset.question);
  if (!course || !question) return;
  confirmDialog({
    title: 'Supprimer cette question ?',
    message: 'Elle sera retirée du quiz final.',
    confirmLabel: 'Supprimer',
    onConfirm: async () => {
      await api(`/api/courses/${course.id}/quiz/${question.id}`, { method: 'DELETE' });
      await refresh();
      toast('Question supprimée.', 'info');
    },
  });
});

/* ------------------------------------------------------------------ */
/* modales & actions : apprenants                                      */
/* ------------------------------------------------------------------ */

onAction('new-learner', () => {
  const options = state.ws.courses
    .map((course) => `<option value="${esc(course.id)}">${esc(course.title)}</option>`)
    .join('');
  if (!state.ws.courses.length) {
    toast('Créez d’abord une formation.', 'error');
    return;
  }
  openModal({
    title: 'Inscrire un apprenant',
    submitLabel: 'Inscrire',
    body: `
      <div class="form-row">
        <div class="field"><label for="nlName">Nom complet</label><input class="input" id="nlName" name="name" placeholder="Nom de l’apprenant" required></div>
        <div class="field"><label for="nlEmail">Email</label><input class="input" id="nlEmail" name="email" type="email" placeholder="apprenant@exemple.com" required></div>
      </div>
      <div class="field"><label for="nlCourse">Formation</label><select class="select" id="nlCourse" name="courseId">${options}</select></div>
      <p class="hint">Si cet email correspond à un compte KyllBot, l’apprenant sera lié automatiquement et signalé « Compte lié ».</p>
    `,
    onSubmit: async (formData) => {
      const { learner } = await api('/api/learners', {
        method: 'POST',
        body: JSON.stringify({ name: formData.get('name'), email: formData.get('email'), courseId: formData.get('courseId') }),
      });
      await refresh();
      toast(
        learner.hasAccount ? 'Compte trouvé : apprenant lié.' : 'Aucun compte trouvé : apprenant ajouté en attente.',
        learner.hasAccount ? 'success' : 'info',
      );
    },
  });
});

onAction('edit-learner', (el) => {
  const learner = state.ws.learners.find((entry) => entry.id === el.dataset.id);
  if (!learner) return;
  openModal({
    title: `Modifier ${learner.name}`,
    submitLabel: 'Enregistrer',
    body: `
      <div class="field"><label for="elName">Nom</label><input class="input" id="elName" name="name" value="${esc(learner.name)}" required></div>
      <div class="form-row">
        <div class="field"><label for="elProgress">Progression (%)</label><input class="input" id="elProgress" name="progress" type="number" min="0" max="100" value="${learner.progress}"></div>
        <div class="field"><label for="elScore">Score (/100)</label><input class="input" id="elScore" name="score" type="number" min="0" max="100" value="${learner.score}"></div>
      </div>
      <div class="field"><label for="elCourse">Formation</label>
        <select class="select" id="elCourse" name="courseId">
          ${state.ws.courses.map((course) => `<option value="${esc(course.id)}" ${course.id === learner.courseId ? 'selected' : ''}>${esc(course.title)}</option>`).join('')}
        </select>
      </div>
    `,
    onSubmit: async (formData) => {
      await api(`/api/learners/${learner.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: formData.get('name'),
          progress: Number(formData.get('progress')),
          score: Number(formData.get('score')),
          courseId: formData.get('courseId'),
        }),
      });
      await refresh();
      toast('Apprenant mis à jour.');
    },
  });
});

onAction('check-learner', async (el) => {
  const learner = state.ws.learners.find((entry) => entry.id === el.dataset.id);
  if (!learner) return;
  await refresh();
  const updated = state.ws.learners.find((entry) => entry.id === el.dataset.id);
  toast(
    updated?.hasAccount ? `Compte trouvé pour ${learner.email}.` : `Aucun compte trouvé pour ${learner.email}.`,
    updated?.hasAccount ? 'success' : 'info',
  );
});

onAction('delete-learner', (el) => {
  const learner = state.ws.learners.find((entry) => entry.id === el.dataset.id);
  if (!learner) return;
  confirmDialog({
    title: `Retirer ${learner.name} ?`,
    message: 'L’apprenant et sa progression seront supprimés de ce studio.',
    confirmLabel: 'Retirer',
    onConfirm: async () => {
      await api(`/api/learners/${learner.id}`, { method: 'DELETE' });
      await refresh();
      toast('Apprenant retiré.', 'info');
    },
  });
});
