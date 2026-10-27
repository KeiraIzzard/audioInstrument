/* theme.js — light / dark mode, shared by every page.
   Order of precedence: the visitor's saved choice, then their system setting.
   Runs in <head> (not deferred) so the right theme is applied before first
   paint and the page never flashes the wrong colours. */
(function () {
  'use strict';

  var KEY = 'ds-theme';
  var root = document.documentElement;
  var query = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  // localStorage can throw (private windows, blocked storage), so always wrap it
  function readSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) { /* choice just won't persist */ }
  }

  function systemTheme() { return query && query.matches ? 'light' : 'dark'; }
  function currentTheme() { return root.getAttribute('data-theme') || systemTheme(); }

  var saved = readSaved();
  if (saved === 'light' || saved === 'dark') root.setAttribute('data-theme', saved);

  function syncButton() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    btn.textContent = next === 'light' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  function announceChange() {
    syncButton();
    // main.js listens for this so the canvas can redraw in the new colours
    document.dispatchEvent(new CustomEvent('themechange', { detail: currentTheme() }));
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    save(theme);
    announceChange();
  }

  // expose a tiny API for main.js
  window.DSTheme = { get: currentTheme, set: setTheme };

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }
    syncButton();
  });

  // follow the system setting live, but only if the visitor hasn't chosen
  if (query && query.addEventListener) {
    query.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) announceChange();
    });
  }
})();
