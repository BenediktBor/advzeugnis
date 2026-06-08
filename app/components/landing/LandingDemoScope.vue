<script setup lang="ts">
import { landingDemoStudent, landingTemplateSet } from '~/data/landingDemo'
import { useLandingReportDemo } from '~/composables/useLandingReportDemo'
import { provideLandingDemo } from '~/composables/useLandingDemoContext'

const demo = useLandingReportDemo(landingTemplateSet, landingDemoStudent)
provideLandingDemo(demo)
</script>

<template>
	<slot />
</template>
