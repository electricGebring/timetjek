<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
    <div class="max-w-2xl mx-auto space-y-6">
      <h1 class="text-4xl font-bold text-white text-center mb-8">
        Tailwind CSS Test
      </h1>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Colors & Typography</h2>
        <p class="text-gray-600 mb-2">This is regular text</p>
        <p class="text-blue-500 font-medium">This is blue medium text</p>
        <p class="text-green-600 font-bold">This is green bold text</p>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Buttons</h2>
        <div class="flex gap-4 flex-wrap">
          <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Primary Button
          </button>
          <button class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Success Button
          </button>
          <button class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors">
            Danger Button
          </button>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Flexbox & Grid</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-blue-100 p-4 rounded text-center">
            <div class="text-3xl mb-2">📱</div>
            <p class="font-semibold">Responsive</p>
          </div>
          <div class="bg-green-100 p-4 rounded text-center">
            <div class="text-3xl mb-2">⚡</div>
            <p class="font-semibold">Fast</p>
          </div>
          <div class="bg-purple-100 p-4 rounded text-center">
            <div class="text-3xl mb-2">🎨</div>
            <p class="font-semibold">Beautiful</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-lg p-6">
        <h2 class="text-2xl font-semibold text-gray-800 mb-4">Spacing & Borders</h2>
        <div class="space-y-3">
          <div class="border-2 border-blue-500 p-3 rounded">Blue border</div>
          <div class="border-4 border-green-500 p-3 rounded-lg">Green thick border</div>
          <div class="border-l-4 border-red-500 bg-red-50 p-3">Left accent border</div>
        </div>
      </div>

      <div class="text-center text-white text-sm">
        ✅ If you can see styled content, Tailwind is working!
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// No logic needed for this test component
</script>
