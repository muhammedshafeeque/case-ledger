import type { Request, Response, NextFunction } from "express";
import * as forensicService from "./forensic.service.js";
import * as jobsService from "./forensic-jobs.service.js";
import { successResponse } from "../../shared/schemas/envelope.schema.js";
import { assertCaseAccessForUser } from "./case-access.js";

export async function evidence(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.listEvidence(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function jobs(req: Request, res: Response, next: NextFunction) {
  try {
    await assertCaseAccessForUser(req.params.caseId as string, req.user!.id, req.user!.role);
    const data = await jobsService.listJobsForCase(req.params.caseId as string);
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function custody(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.getCustodyChain(
      req.params.documentId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.verifyDocumentHash(
      req.params.documentId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function timeline(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.getTimeline(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function network(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.getNetwork(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function analysis(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.getAnalysis(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function reportHtml(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.query.profile as string | undefined;
    const html = await forensicService.exportReportHtml(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role,
      profile
    );
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (e) {
    next(e);
  }
}

export async function reportPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.query.profile as string | undefined;
    const buf = await forensicService.exportReportPdf(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role,
      profile
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="evidence-${req.params.caseId}.pdf"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

export async function reportZip(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.query.profile as string | undefined;
    const buf = await forensicService.buildReportZip(
      req.params.caseId as string,
      req.user!.id,
      req.user!.role,
      profile
    );
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="evidence-${req.params.caseId}.zip"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
}

export async function documentContent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.getDocumentContent(
      req.params.documentId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function listAnnotations(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.listAnnotations(
      req.params.documentId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function createAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await forensicService.createAnnotation(
      req.params.documentId as string,
      req.user!.id,
      req.user!.role,
      req.body
    );
    res.status(201).json(successResponse(data));
  } catch (e) {
    next(e);
  }
}

export async function deleteAnnotation(req: Request, res: Response, next: NextFunction) {
  try {
    await forensicService.deleteAnnotation(
      req.params.annotationId as string,
      req.user!.id,
      req.user!.role
    );
    res.json(successResponse({ deleted: true }));
  } catch (e) {
    next(e);
  }
}
