<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
    <div class="mx-auto max-w-2xl space-y-6">
      <h1 class="mb-8 text-center text-4xl font-bold text-white">Tailwind CSS Test</h1>

      <div class="rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold text-gray-800">Colors & Typography</h2>
        <p class="mb-2 text-gray-600">This is regular text</p>
        <p class="font-medium text-blue-500">This is blue medium text</p>
        <p class="font-bold text-green-600">This is green bold text</p>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold text-gray-800">Buttons</h2>
        <div class="flex flex-wrap gap-4">
          <button class="rounded bg-blue-500 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700">
            Primary Button
          </button>
          <button class="rounded bg-green-500 px-4 py-2 font-bold text-white transition-colors hover:bg-green-700">
            Success Button
          </button>
          <button class="rounded bg-red-500 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700">
            Danger Button
          </button>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold text-gray-800">Flexbox & Grid</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded bg-blue-100 p-4 text-center">
            <div class="mb-2 text-3xl">📱</div>
            <p class="font-semibold">Responsive</p>
          </div>
          <div class="rounded bg-green-100 p-4 text-center">
            <div class="mb-2 text-3xl">⚡</div>
            <p class="font-semibold">Fast</p>
          </div>
          <div class="rounded bg-purple-100 p-4 text-center">
            <div class="mb-2 text-3xl">🎨</div>
            <p class="font-semibold">Beautiful</p>
          </div>
        </div>
      </div>

      <div class="rounded-lg bg-white p-6 shadow-lg">
        <h2 class="mb-4 text-2xl font-semibold text-gray-800">Spacing & Borders</h2>
        <div class="space-y-3">
          <div class="rounded border-2 border-blue-500 p-3">Blue border</div>
          <div class="rounded-lg border-4 border-green-500 p-3">Green thick border</div>
          <div class="border-l-4 border-red-500 bg-red-50 p-3">Left accent border</div>
        </div>
      </div>

      <div class="text-center text-sm text-white">✅ If you can see styled content, Tailwind is working!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No logic needed for this test component
</script>
